import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCookieGet = vi.fn();
const mockSessionFindUnique = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    session: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      delete: vi.fn(),
    },
  },
}));

import { GET as getAdminCallers, POST as createAdminCaller } from "@/app/api/admin/callers/route";
import { GET as getAdminSettings, PATCH as patchAdminSettings } from "@/app/api/admin/settings/route";
import { POST as postAdminCampaign } from "@/app/api/admin/campaigns/route";
import { POST as postLead } from "@/app/api/leads/route";
import { POST as postTelegramSummary } from "@/app/api/telegram/summary/route";
import {
  announceLeadSchema,
  createCallerSchema,
  createCampaignSchema,
  loginSchema,
  updateProfileSchema,
} from "@/lib/validation";

describe("Server-Side RBAC & Validation Enforcement", () => {
  beforeEach(() => {
    mockCookieGet.mockReset();
    mockSessionFindUnique.mockReset();
  });

  it("blocks unauthenticated requests with 401 across protected endpoints", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const callersRes = await getAdminCallers(new NextRequest("http://localhost/api/admin/callers"));
    expect(callersRes.status).toBe(401);

    const leadRes = await postLead(
      new NextRequest("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({ campaignId: "c1", idempotencyKey: "12345678" }),
      })
    );
    expect(leadRes.status).toBe(401);

    const summaryRes = await postTelegramSummary(
      new NextRequest("http://localhost/api/telegram/summary", {
        method: "POST",
        body: JSON.stringify({ type: "campaigns" }),
      })
    );
    expect(summaryRes.status).toBe(401);
  });

  it("blocks deactivated accounts even with an active session cookie", async () => {
    mockCookieGet.mockReturnValue({ value: "valid_raw_token" });
    mockSessionFindUnique.mockResolvedValue({
      id: "sess_deactivated",
      expiresAt: new Date(Date.now() + 3600_000),
      user: {
        id: "u_deactivated",
        fullName: "Deactivated Caller",
        username: "old_caller",
        email: null,
        role: "CALLER",
        status: "DEACTIVATED",
        deletedAt: null,
        announcementName: "Old",
        announcementTemplate: "{name} got a lead in {campaign}, lets shout out to him!",
        tokenVersion: 1,
        createdAt: new Date(),
      },
    });

    const leadRes = await postLead(
      new NextRequest("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({ campaignId: "c1", idempotencyKey: "12345678" }),
      })
    );
    expect(leadRes.status).toBe(401);

    const summaryRes = await postTelegramSummary(
      new NextRequest("http://localhost/api/telegram/summary", {
        method: "POST",
        body: JSON.stringify({ type: "campaigns" }),
      })
    );
    expect(summaryRes.status).toBe(401);
  });

  it("blocks CALLER role from all ADMIN endpoints with 403 Forbidden", async () => {
    mockCookieGet.mockReturnValue({ value: "valid_raw_token" });
    mockSessionFindUnique.mockResolvedValue({
      id: "sess_1",
      expiresAt: new Date(Date.now() + 3600_000),
      user: {
        id: "u_caller",
        fullName: "Caller One",
        username: "caller1",
        email: null,
        role: "CALLER",
        status: "ACTIVE",
        deletedAt: null,
        announcementName: "Caller",
        announcementTemplate: "{name} got a lead in {campaign}, lets shout out to him!",
        tokenVersion: 1,
        createdAt: new Date(),
      },
    });

    const getCallers = await getAdminCallers(new NextRequest("http://localhost/api/admin/callers"));
    expect(getCallers.status).toBe(403);

    const postCaller = await createAdminCaller(
      new NextRequest("http://localhost/api/admin/callers", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(postCaller.status).toBe(403);

    const postCampaign = await postAdminCampaign(
      new NextRequest("http://localhost/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(postCampaign.status).toBe(403);

    const getSettings = await getAdminSettings();
    expect(getSettings.status).toBe(403);

    const patchSettings = await patchAdminSettings(
      new NextRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ brandName: "Hacked" }),
      })
    );
    expect(patchSettings.status).toBe(403);
  });

  it("validates schemas strictly for campaigns, callers, profile templates, and announcements", () => {
    expect(
      createCampaignSchema.safeParse({ name: "Test", dailyTarget: 0 }).success
    ).toBe(false);
    expect(
      createCampaignSchema.safeParse({ name: "Digital Nomad", dailyTarget: 50 }).success
    ).toBe(true);

    expect(
      createCallerSchema.safeParse({
        fullName: "Ahmed",
        username: "bad user!",
        password: "Password123!",
      }).success
    ).toBe(false);

    expect(
      updateProfileSchema.safeParse({
        announcementName: "Ahmed",
        announcementTemplate: "{name} got a lead in {unknown}",
      }).success
    ).toBe(false);

    expect(
      announceLeadSchema.safeParse({
        campaignId: "",
        idempotencyKey: "12345678",
      }).success
    ).toBe(false);

    expect(
      loginSchema.parse({ username: "admin", password: "secret" }).rememberMe
    ).toBe(false);
    expect(
      loginSchema.parse({ username: "admin", password: "secret", rememberMe: true })
        .rememberMe
    ).toBe(true);
  });
});
