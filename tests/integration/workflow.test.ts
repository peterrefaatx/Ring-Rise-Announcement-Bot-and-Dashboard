import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { announceLead, AnnouncementError } from "@/lib/announcements";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { getLeaderboardForRange } from "@/lib/leaderboard";
import { getEstDayRangeUtc } from "@/lib/timezone";
import {
  processTelegramJob,
  sweepPendingTelegramJobs,
  type TelegramTransport,
} from "@/lib/telegram";
import { getMissedActivityEvents } from "@/lib/realtime";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabaseUrl)("PostgreSQL Integration Workflows", () => {
  let adminId: string;
  let ahmedId: string;
  let mohamedId: string;
  let activeCampaignId: string;
  let archivedCampaignId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean operational tables in dependency order for isolated test runs
    await prisma.telegramNotificationJob.deleteMany();
    await prisma.leadAnnouncement.deleteMany();
    await prisma.activityEvent.deleteMany();
    await prisma.campaignTargetHistory.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();

    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        telegramEnabled: true,
        telegramChatId: "-100999888777",
      },
      create: {
        id: "default",
        telegramEnabled: true,
        telegramChatId: "-100999888777",
      },
    });

    process.env.TELEGRAM_BOT_TOKEN = "123456:TEST_TOKEN";
    process.env.TELEGRAM_CHAT_ID = "-100999888777";

    const admin = await prisma.user.create({
      data: {
        fullName: "Admin User",
        username: "admin_test",
        passwordHash: hashPassword("AdminPass123!"),
        role: "ADMIN",
        status: "ACTIVE",
        announcementName: "Admin",
      },
    });
    adminId = admin.id;

    const ahmed = await prisma.user.create({
      data: {
        fullName: "Ahmed Mohamed",
        username: "ahmed",
        passwordHash: hashPassword("CallerPass123!"),
        role: "CALLER",
        status: "ACTIVE",
        announcementName: "Ahmed",
        announcementTemplate: "{name} got a lead in {campaign}, lets shout out to him!",
      },
    });
    ahmedId = ahmed.id;

    const mohamed = await prisma.user.create({
      data: {
        fullName: "Mohamed Hassan",
        username: "mohamed",
        passwordHash: hashPassword("CallerPass123!"),
        role: "CALLER",
        status: "ACTIVE",
        announcementName: "Mo",
        announcementTemplate: "{name} just secured a new lead for {campaign}! Great work!",
      },
    });
    mohamedId = mohamed.id;

    const activeCamp = await prisma.campaign.create({
      data: {
        name: "Digital Nomad",
        dailyTarget: 2,
        status: "ACTIVE",
      },
    });
    activeCampaignId = activeCamp.id;

    const archivedCamp = await prisma.campaign.create({
      data: {
        name: "Old Campaign",
        dailyTarget: 10,
        status: "ARCHIVED",
      },
    });
    archivedCampaignId = archivedCamp.id;
  });

  it("enforces idempotency, single lead per call, and rejects archived campaigns", async () => {
    // Reject archived campaign
    await expect(
      announceLead(
        {
          userId: ahmedId,
          campaignId: archivedCampaignId,
          idempotencyKey: "req-archived-1",
        },
        { deferTelegramDispatch: true }
      )
    ).rejects.toThrow(AnnouncementError);

    // Double click with same idempotencyKey creates exactly 1 lead
    const [first, duplicate] = await Promise.all([
      announceLead(
        {
          userId: ahmedId,
          campaignId: activeCampaignId,
          idempotencyKey: "double-click-key-001",
        },
        { deferTelegramDispatch: true }
      ),
      announceLead(
        {
          userId: ahmedId,
          campaignId: activeCampaignId,
          idempotencyKey: "double-click-key-001",
        },
        { deferTelegramDispatch: true }
      ),
    ]);

    expect(first.announcement.id).toBe(duplicate.announcement.id);
    expect(await prisma.leadAnnouncement.count()).toBe(1);

    // Concurrent distinct announcements never lose leads or fail
    await Promise.all(
      Array.from({ length: 5 }, (_, idx) =>
        announceLead(
          {
            userId: mohamedId,
            campaignId: activeCampaignId,
            idempotencyKey: `concurrent-${idx}-0001`,
          },
          { deferTelegramDispatch: true }
        )
      )
    );

    expect(await prisma.leadAnnouncement.count()).toBe(6);

    // Campaign target exceeded (6 / 2) continues counting and caps progress bar at 100%
    const snapshot = await getDashboardSnapshot(ahmedId);
    const camp = snapshot.campaigns.find((c) => c.id === activeCampaignId);
    expect(camp?.leadsToday).toBe(6);
    expect(camp?.progressPercent).toBe(100);
    expect(camp?.targetReached).toBe(true);
  });

  it("enforces tie-breaking by first achievement timestamp and fixed EST daily reset", async () => {
    // Seed historical lead just before midnight EST on 2026-11-24 (04:59:59Z on Nov 25)
    await prisma.leadAnnouncement.create({
      data: {
        userId: ahmedId,
        campaignId: activeCampaignId,
        idempotencyKey: "est-before-midnight",
        callerNameSnapshot: "Ahmed",
        campaignNameSnapshot: "Digital Nomad",
        renderedMessage: "Ahmed got a lead in Digital Nomad",
        businessDateEst: "2026-11-24",
        businessMonthEst: "2026-11",
        createdAt: new Date("2026-11-25T04:59:59.000Z"),
      },
    });

    // Seed leads on 2026-11-25 EST: Mohamed hits 2 leads at 10:00 EST, Ahmed hits 2 leads at 11:00 EST
    await prisma.leadAnnouncement.createMany({
      data: [
        {
          userId: mohamedId,
          campaignId: activeCampaignId,
          idempotencyKey: "m1",
          callerNameSnapshot: "Mo",
          campaignNameSnapshot: "Digital Nomad",
          renderedMessage: "m1",
          businessDateEst: "2026-11-25",
          businessMonthEst: "2026-11",
          createdAt: new Date("2026-11-25T14:00:00.000Z"),
        },
        {
          userId: mohamedId,
          campaignId: activeCampaignId,
          idempotencyKey: "m2",
          callerNameSnapshot: "Mo",
          campaignNameSnapshot: "Digital Nomad",
          renderedMessage: "m2",
          businessDateEst: "2026-11-25",
          businessMonthEst: "2026-11",
          createdAt: new Date("2026-11-25T15:00:00.000Z"), // 10:00 EST
        },
        {
          userId: ahmedId,
          campaignId: activeCampaignId,
          idempotencyKey: "a1",
          callerNameSnapshot: "Ahmed",
          campaignNameSnapshot: "Digital Nomad",
          renderedMessage: "a1",
          businessDateEst: "2026-11-25",
          businessMonthEst: "2026-11",
          createdAt: new Date("2026-11-25T14:30:00.000Z"),
        },
        {
          userId: ahmedId,
          campaignId: activeCampaignId,
          idempotencyKey: "a2",
          callerNameSnapshot: "Ahmed",
          campaignNameSnapshot: "Digital Nomad",
          renderedMessage: "a2",
          businessDateEst: "2026-11-25",
          businessMonthEst: "2026-11",
          createdAt: new Date("2026-11-25T16:00:00.000Z"), // 11:00 EST
        },
      ],
    });

    const day25 = getEstDayRangeUtc("2026-11-25");
    const dailyBoard = await getLeaderboardForRange({
      startUtc: day25.startUtc,
      endUtc: day25.endUtc,
      includeZeroLeadActiveCallers: false,
    });

    // Both have 2 leads on Nov 25 EST, but Mohamed reached 2 leads earlier (15:00Z vs 16:00Z)
    expect(dailyBoard[0].userId).toBe(mohamedId);
    expect(dailyBoard[0].leadCount).toBe(2);
    expect(dailyBoard[1].userId).toBe(ahmedId);
    expect(dailyBoard[1].leadCount).toBe(2);

    // All-time includes Nov 24 lead, so Ahmed has 3 vs Mohamed 2
    const allTime = await getLeaderboardForRange({ includeZeroLeadActiveCallers: false });
    expect(allTime[0].userId).toBe(ahmedId);
    expect(allTime[0].leadCount).toBe(3);

    // Admins must never compete in leaderboards even if they announce a lead
    await announceLead(
      {
        userId: adminId,
        campaignId: activeCampaignId,
        idempotencyKey: "admin-should-not-rank",
      },
      { deferTelegramDispatch: true }
    );
    const allTimeWithAdminLead = await getLeaderboardForRange({
      includeZeroLeadActiveCallers: true,
    });
    expect(allTimeWithAdminLead.some((entry) => entry.userId === adminId)).toBe(false);
  });

  it("delivers customized Telegram message, retries on failure, and prevents duplicates", async () => {
    const res = await announceLead(
      {
        userId: mohamedId,
        campaignId: activeCampaignId,
        idempotencyKey: "tg-retry-001",
      },
      { deferTelegramDispatch: true }
    );

    expect(res.announcement.renderedMessage).toBe(
      "Mo just secured a new lead for Digital Nomad! Great work!"
    );
    expect(res.telegramJobId).toBeTruthy();
    const jobId = res.telegramJobId!;

    // 1. Simulate Telegram API outage (500)
    const failingTransport: TelegramTransport = {
      async sendMessage() {
        return { ok: false, error: "502 Bad Gateway", retryable: true };
      },
    };
    const firstAttempt = await processTelegramJob(jobId, failingTransport);
    expect(firstAttempt.status).toBe("RETRYING");

    // Lead remains safely saved even though Telegram failed
    expect(await prisma.leadAnnouncement.count()).toBe(1);

    // 2. Make job due immediately & recover with mocked transport
    await prisma.telegramNotificationJob.update({
      where: { id: jobId },
      data: { nextRetryAt: new Date(Date.now() - 1000) },
    });

    const sentPayloads: string[] = [];
    const okTransport: TelegramTransport = {
      async sendMessage({ text }) {
        sentPayloads.push(text);
        return { ok: true, messageId: "9001" };
      },
    };

    const swept = await sweepPendingTelegramJobs(okTransport);
    expect(swept).toBe(1);
    expect(sentPayloads).toEqual([
      "Mo just secured a new lead for Digital Nomad! Great work!",
    ]);

    // 3. Re-processing the same job must NOT send a duplicate Telegram message
    const secondRun = await processTelegramJob(jobId, okTransport);
    expect(secondRun.skipped).toBe(true);
    expect(sentPayloads.length).toBe(1);
  });

  it("emits ordered ActivityEvents and replays missed events cleanly on reconnect", async () => {
    const baseline = await getMissedActivityEvents(0);
    const startSeq = baseline.latestSeq;

    await announceLead(
      {
        userId: ahmedId,
        campaignId: activeCampaignId,
        idempotencyKey: "rt-1",
      },
      { deferTelegramDispatch: true }
    );
    await announceLead(
      {
        userId: mohamedId,
        campaignId: activeCampaignId,
        idempotencyKey: "rt-2",
      },
      { deferTelegramDispatch: true }
    );

    const missed = await getMissedActivityEvents(startSeq);
    expect(missed.resyncRequired).toBe(false);
    expect(missed.events.length).toBe(2);
    expect(missed.events[0].seq).toBeLessThan(missed.events[1].seq);
    expect(missed.events[0].type).toBe("LEAD_ANNOUNCED");
  });

  it("verifies password hashing and user credentials integrity", async () => {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    expect(admin).toBeTruthy();
    expect(verifyPassword("AdminPass123!", admin!.passwordHash)).toBe(true);
  });
});
