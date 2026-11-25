import { describe, it, expect } from "vitest";
import {
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
  getEstMonthRangeUtc,
  msUntilNextEstMidnight,
} from "@/lib/timezone";
import {
  DEFAULT_ANNOUNCEMENT_TEMPLATE,
  renderAnnouncementMessage,
  validateAnnouncementTemplate,
} from "@/lib/template";
import { rankLeaderboardRows } from "@/lib/leaderboard";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  verifyPassword,
} from "@/lib/crypto";
import {
  buildCsvBuffer,
  buildExcelBuffer,
  sanitizeSpreadsheetCell,
} from "@/lib/export";

describe("Fixed EST (UTC-5) Timezone Calculations", () => {
  it("resets business day at midnight EST (05:00:00 UTC) in winter without DST drift", () => {
    const beforeMidnightEst = new Date("2026-01-15T04:59:59.999Z");
    const atMidnightEst = new Date("2026-01-15T05:00:00.000Z");

    expect(getBusinessDateEst(beforeMidnightEst)).toBe("2026-01-14");
    expect(getBusinessDateEst(atMidnightEst)).toBe("2026-01-15");
  });

  it("does NOT switch to EDT during summer months (stays fixed UTC-5)", () => {
    const summerBeforeMidnightEst = new Date("2026-07-15T04:59:59.999Z");
    const summerAtMidnightEst = new Date("2026-07-15T05:00:00.000Z");

    expect(getBusinessDateEst(summerBeforeMidnightEst)).toBe("2026-07-14");
    expect(getBusinessDateEst(summerAtMidnightEst)).toBe("2026-07-15");
    expect(getBusinessMonthEst(summerAtMidnightEst)).toBe("2026-07");
  });

  it("computes exact UTC bounds for an EST day and month", () => {
    const dayRange = getEstDayRangeUtc("2026-11-25");
    expect(dayRange.startUtc.toISOString()).toBe("2026-11-25T05:00:00.000Z");
    expect(dayRange.endUtc.toISOString()).toBe("2026-11-26T05:00:00.000Z");

    const monthRange = getEstMonthRangeUtc("2026-11");
    expect(monthRange.startUtc.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(monthRange.endUtc.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("calculates positive ms until next EST midnight", () => {
    const twoMinutesBeforeReset = new Date("2026-06-01T04:58:00.000Z");
    expect(msUntilNextEstMidnight(twoMinutesBeforeReset)).toBe(120000);
  });
});

describe("Announcement Template Validation & Server-Side Rendering", () => {
  it("renders default and custom templates accurately", () => {
    expect(
      renderAnnouncementMessage(
        DEFAULT_ANNOUNCEMENT_TEMPLATE,
        "Ahmed",
        "Digital Nomad"
      )
    ).toBe("Ahmed got a lead in Digital Nomad, lets shout out to him!");

    expect(
      renderAnnouncementMessage(
        "{name} just secured a new lead for {campaign}! Great work!",
        "Peter",
        "Study in Spain"
      )
    ).toBe("Peter just secured a new lead for Study in Spain! Great work!");
  });

  it("prevents $1/$& replacement injection in caller or campaign names", () => {
    const rendered = renderAnnouncementMessage(
      DEFAULT_ANNOUNCEMENT_TEMPLATE,
      "Test $1 $&",
      "Campaign $$"
    );
    expect(rendered).toBe(
      "Test $1 $& got a lead in Campaign $$, lets shout out to him!"
    );
  });

  it("rejects empty, missing required placeholders, unsupported placeholders, and oversized templates", () => {
    expect(validateAnnouncementTemplate("   ").valid).toBe(false);
    expect(validateAnnouncementTemplate("{name} got a lead!").valid).toBe(false);
    expect(validateAnnouncementTemplate("Got a lead in {campaign}!").valid).toBe(false);
    expect(
      validateAnnouncementTemplate("{name} got {lead} in {campaign}").valid
    ).toBe(false);
    expect(
      validateAnnouncementTemplate("{name} got a lead in {campaign").valid
    ).toBe(false);
    expect(
      validateAnnouncementTemplate(
        "{name} {campaign} " + "a".repeat(280)
      ).valid
    ).toBe(false);
    expect(
      validateAnnouncementTemplate("{name} closed one in {campaign}!").valid
    ).toBe(true);
  });
});

describe("Deterministic Leaderboard Tie-Breaking", () => {
  it("ranks higher lead counts first, then earlier achievement timestamp, then sequence", () => {
    const ranked = rankLeaderboardRows([
      {
        userId: "u_mohamed",
        announcementName: "Mohamed",
        fullName: "Mohamed Ali",
        status: "ACTIVE",
        leadCount: 10,
        achievedAtMs: new Date("2026-11-25T16:15:00Z").getTime(), // 11:15 EST
        achievedSeq: 55,
      },
      {
        userId: "u_ahmed",
        announcementName: "Ahmed",
        fullName: "Ahmed Mohamed",
        status: "ACTIVE",
        leadCount: 10,
        achievedAtMs: new Date("2026-11-25T15:30:00Z").getTime(), // 10:30 EST
        achievedSeq: 50,
      },
      {
        userId: "u_peter",
        announcementName: "Peter",
        fullName: "Peter Smith",
        status: "ACTIVE",
        leadCount: 12,
        achievedAtMs: new Date("2026-11-25T17:00:00Z").getTime(),
        achievedSeq: 60,
      },
      {
        userId: "u_tie_seq_2",
        announcementName: "Zed",
        fullName: "Zed Two",
        status: "ACTIVE",
        leadCount: 5,
        achievedAtMs: new Date("2026-11-25T14:00:00Z").getTime(),
        achievedSeq: 22,
      },
      {
        userId: "u_tie_seq_1",
        announcementName: "Amy",
        fullName: "Amy One",
        status: "ACTIVE",
        leadCount: 5,
        achievedAtMs: new Date("2026-11-25T14:00:00Z").getTime(),
        achievedSeq: 21,
      },
    ]);

    expect(ranked.map((r) => r.announcementName)).toEqual([
      "Peter",
      "Ahmed",
      "Mohamed",
      "Amy",
      "Zed",
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("Cryptography & Export Security", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("StrongPass#2026");
    expect(verifyPassword("StrongPass#2026", hash)).toBe(true);
    expect(verifyPassword("WrongPass", hash)).toBe(false);
  });

  it("encrypts and decrypts secrets symmetrically", () => {
    const secret = "123456789:AAH_test_bot_token_value";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("neutralizes spreadsheet formula injection in CSV and Excel exports", async () => {
    expect(sanitizeSpreadsheetCell("=CMD|'/C calc'!A0")).toBe("'=CMD|'/C calc'!A0");
    expect(sanitizeSpreadsheetCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");

    const csv = buildCsvBuffer(["Name", "Count"], [["=evil()", 4]]).toString("utf8");
    expect(csv).toContain("'=evil(),4");

    const xlsx = await buildExcelBuffer("Test", ["Name", "Count"], [["Ahmed", 10]]);
    expect(xlsx.byteLength).toBeGreaterThan(1000);
  });
});
