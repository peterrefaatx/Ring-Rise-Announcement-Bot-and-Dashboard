import { prisma } from "./db";
import { getLeaderboardForRange, type LeaderboardEntry } from "./leaderboard";
import { cached } from "./cache";
import {
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
  getEstMonthRangeUtc,
} from "./timezone";

export interface DailySummaryRow {
  businessDateEst: string;
  totalLeads: number;
  topCallerName: string | null;
  topCallerLeads: number;
}

export interface MonthlySummaryRow {
  businessMonthEst: string;
  totalLeads: number;
  winnerName: string | null;
  winnerLeads: number;
}

export interface DailyDetailAnalytics {
  businessDateEst: string;
  totalLeads: number;
  leaderboard: LeaderboardEntry[];
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    status: string;
    leadsCount: number;
    dailyTarget: number;
    achievementPercent: number;
  }>;
  announcements: Array<{
    id: string;
    callerName: string;
    campaignName: string;
    renderedMessage: string;
    createdAt: string;
    telegramStatus: string | null;
  }>;
}

export interface MonthlyDetailAnalytics {
  businessMonthEst: string;
  totalLeads: number;
  leaderboard: LeaderboardEntry[];
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    status: string;
    leadsCount: number;
  }>;
  dailyBreakdown: Array<{
    businessDateEst: string;
    totalLeads: number;
  }>;
}

export interface CallerHistoryAnalytics {
  caller: {
    id: string;
    fullName: string;
    username: string;
    announcementName: string;
    status: string;
    deletedAt: string | null;
    createdAt: string;
  };
  totals: {
    today: number;
    thisMonth: number;
    lifetime: number;
  };
  dailyHistory: Array<{ businessDateEst: string; leadCount: number }>;
  monthlyHistory: Array<{ businessMonthEst: string; leadCount: number }>;
  campaignBreakdown: Array<{
    campaignId: string;
    campaignName: string;
    leadCount: number;
  }>;
  recentAnnouncements: Array<{
    id: string;
    campaignName: string;
    renderedMessage: string;
    businessDateEst: string;
    createdAt: string;
  }>;
}

export interface CampaignHistoryAnalytics {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    dailyTarget: number;
    status: string;
    deletedAt: string | null;
    createdAt: string;
  };
  totals: {
    today: number;
    thisMonth: number;
    lifetime: number;
  };
  dailyHistory: Array<{
    businessDateEst: string;
    leadCount: number;
    effectiveTarget: number;
    achievementPercent: number;
  }>;
  monthlyHistory: Array<{ businessMonthEst: string; leadCount: number }>;
  targetHistory: Array<{
    id: string;
    dailyTarget: number;
    effectiveDateEst: string;
    effectiveFrom: string;
    changedByName: string | null;
  }>;
  topCallers: Array<{
    userId: string;
    announcementName: string;
    leadCount: number;
  }>;
}

async function resolveEffectiveCampaignTargetForDate(
  campaignId: string,
  businessDateEst: string,
  fallbackTarget: number
): Promise<number> {
  const { endUtc } = getEstDayRangeUtc(businessDateEst);
  const record = await prisma.campaignTargetHistory.findFirst({
    where: {
      campaignId,
      effectiveFrom: { lt: endUtc },
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return record?.dailyTarget ?? fallbackTarget;
}

export async function getDailySummaryList(limit = 30): Promise<DailySummaryRow[]> {
  return cached(`analytics:daily-list:${limit}:${getBusinessDateEst()}`, 45000, () =>
    computeDailySummaryList(limit)
  );
}

async function computeDailySummaryList(limit = 30): Promise<DailySummaryRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{ businessDateEst: string; totalLeads: number }>
  >`
    SELECT "businessDateEst", COUNT(*)::int AS "totalLeads"
    FROM "LeadAnnouncement"
    GROUP BY "businessDateEst"
    ORDER BY "businessDateEst" DESC
    LIMIT ${limit}
  `;

  const summaries: DailySummaryRow[] = [];
  for (const row of rows) {
    const range = getEstDayRangeUtc(row.businessDateEst);
    const board = await getLeaderboardForRange({
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      includeZeroLeadActiveCallers: false,
    });
    const top = board[0];
    summaries.push({
      businessDateEst: row.businessDateEst,
      totalLeads: Number(row.totalLeads),
      topCallerName: top?.fullName ?? null,
      topCallerLeads: top?.leadCount ?? 0,
    });
  }
  return summaries;
}

export async function getDailyDetailAnalytics(
  businessDateEst: string
): Promise<DailyDetailAnalytics> {
  const isToday = businessDateEst === getBusinessDateEst();
  return cached(
    `analytics:daily-detail:${businessDateEst}`,
    isToday ? 30000 : 300000,
    () => computeDailyDetailAnalytics(businessDateEst)
  );
}

async function computeDailyDetailAnalytics(
  businessDateEst: string
): Promise<DailyDetailAnalytics> {
  const range = getEstDayRangeUtc(businessDateEst);
  const [leaderboard, campaigns, groupedByCampaign, announcements] = await Promise.all([
    getLeaderboardForRange({
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      includeZeroLeadActiveCallers: false,
    }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: {
        createdAt: { gte: range.startUtc, lt: range.endUtc },
      },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.findMany({
      where: {
        createdAt: { gte: range.startUtc, lt: range.endUtc },
      },
      orderBy: { createdAt: "desc" },
      include: {
        telegramJob: { select: { status: true } },
      },
    }),
  ]);

  const countMap = new Map(groupedByCampaign.map((g) => [g.campaignId, g._count.id]));
  const campaignRows = await Promise.all(
    campaigns
      .filter((c) => (countMap.get(c.id) ?? 0) > 0 || (c.status === "ACTIVE" && !c.deletedAt))
      .map(async (c) => {
        const leadsCount = countMap.get(c.id) ?? 0;
        const dailyTarget = await resolveEffectiveCampaignTargetForDate(
          c.id,
          businessDateEst,
          c.dailyTarget
        );
        const achievementPercent =
          dailyTarget > 0 ? Math.round((leadsCount / dailyTarget) * 100) : 0;
        return {
          campaignId: c.id,
          campaignName: c.name,
          status: c.deletedAt ? "DELETED" : c.status,
          leadsCount,
          dailyTarget,
          achievementPercent,
        };
      })
  );

  return {
    businessDateEst,
    totalLeads: announcements.length,
    leaderboard,
    campaigns: campaignRows,
    announcements: announcements.map((a) => ({
      id: a.id,
      callerName: a.callerNameSnapshot,
      campaignName: a.campaignNameSnapshot,
      renderedMessage: a.renderedMessage,
      createdAt: a.createdAt.toISOString(),
      telegramStatus: a.telegramJob?.status ?? null,
    })),
  };
}

export async function getMonthlySummaryList(limit = 24): Promise<MonthlySummaryRow[]> {
  return cached(`analytics:monthly-list:${limit}:${getBusinessMonthEst()}`, 60000, () =>
    computeMonthlySummaryList(limit)
  );
}

async function computeMonthlySummaryList(limit = 24): Promise<MonthlySummaryRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{ businessMonthEst: string; totalLeads: number }>
  >`
    SELECT "businessMonthEst", COUNT(*)::int AS "totalLeads"
    FROM "LeadAnnouncement"
    GROUP BY "businessMonthEst"
    ORDER BY "businessMonthEst" DESC
    LIMIT ${limit}
  `;

  const summaries: MonthlySummaryRow[] = [];
  for (const row of rows) {
    const range = getEstMonthRangeUtc(row.businessMonthEst);
    const board = await getLeaderboardForRange({
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      includeZeroLeadActiveCallers: false,
    });
    const winner = board[0];
    summaries.push({
      businessMonthEst: row.businessMonthEst,
      totalLeads: Number(row.totalLeads),
      winnerName: winner?.fullName ?? null,
      winnerLeads: winner?.leadCount ?? 0,
    });
  }
  return summaries;
}

export async function getMonthlyDetailAnalytics(
  businessMonthEst: string
): Promise<MonthlyDetailAnalytics> {
  const isCurrentMonth = businessMonthEst === getBusinessMonthEst();
  return cached(
    `analytics:monthly-detail:${businessMonthEst}`,
    isCurrentMonth ? 30000 : 300000,
    () => computeMonthlyDetailAnalytics(businessMonthEst)
  );
}

async function computeMonthlyDetailAnalytics(
  businessMonthEst: string
): Promise<MonthlyDetailAnalytics> {
  const range = getEstMonthRangeUtc(businessMonthEst);
  const [leaderboard, campaigns, groupedByCampaign, dailyBreakdown] = await Promise.all([
    getLeaderboardForRange({
      startUtc: range.startUtc,
      endUtc: range.endUtc,
      includeZeroLeadActiveCallers: false,
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: {
        createdAt: { gte: range.startUtc, lt: range.endUtc },
      },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["businessDateEst"],
      where: {
        createdAt: { gte: range.startUtc, lt: range.endUtc },
      },
      _count: { id: true },
      orderBy: { businessDateEst: "asc" },
    }),
  ]);

  const countMap = new Map(groupedByCampaign.map((g) => [g.campaignId, g._count.id]));
  const totalLeads = dailyBreakdown.reduce((sum, d) => sum + d._count.id, 0);

  return {
    businessMonthEst,
    totalLeads,
    leaderboard,
    campaigns: campaigns
      .filter((c) => (countMap.get(c.id) ?? 0) > 0)
      .map((c) => ({
        campaignId: c.id,
        campaignName: c.name,
        status: c.deletedAt ? "DELETED" : c.status,
        leadsCount: countMap.get(c.id) ?? 0,
      })),
    dailyBreakdown: dailyBreakdown.map((d) => ({
      businessDateEst: d.businessDateEst,
      totalLeads: d._count.id,
    })),
  };
}

export async function getCallerHistoryAnalytics(
  userId: string
): Promise<CallerHistoryAnalytics | null> {
  return cached(
    `analytics:caller:${userId}:${getBusinessDateEst()}`,
    30000,
    () => computeCallerHistoryAnalytics(userId)
  );
}

async function computeCallerHistoryAnalytics(
  userId: string
): Promise<CallerHistoryAnalytics | null> {
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      username: true,
      announcementName: true,
      status: true,
      deletedAt: true,
      createdAt: true,
    },
  });
  if (!caller) return null;

  const now = new Date();
  const todayEst = getBusinessDateEst(now);
  const monthEst = getBusinessMonthEst(now);

  const [
    todayCount,
    monthCount,
    lifetimeCount,
    dailyRows,
    monthlyRows,
    campaignGroups,
    campaigns,
    recentAnnouncements,
  ] = await Promise.all([
    prisma.leadAnnouncement.count({ where: { userId, businessDateEst: todayEst } }),
    prisma.leadAnnouncement.count({ where: { userId, businessMonthEst: monthEst } }),
    prisma.leadAnnouncement.count({ where: { userId } }),
    prisma.$queryRaw<Array<{ businessDateEst: string; leadCount: number }>>`
      SELECT "businessDateEst", COUNT(*)::int AS "leadCount"
      FROM "LeadAnnouncement"
      WHERE "userId" = ${userId}
      GROUP BY "businessDateEst"
      ORDER BY "businessDateEst" DESC
      LIMIT 60
    `,
    prisma.$queryRaw<Array<{ businessMonthEst: string; leadCount: number }>>`
      SELECT "businessMonthEst", COUNT(*)::int AS "leadCount"
      FROM "LeadAnnouncement"
      WHERE "userId" = ${userId}
      GROUP BY "businessMonthEst"
      ORDER BY "businessMonthEst" DESC
      LIMIT 24
    `,
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.campaign.findMany({ select: { id: true, name: true } }),
    prisma.leadAnnouncement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

  return {
    caller: {
      id: caller.id,
      fullName: caller.fullName,
      username: caller.username,
      announcementName: caller.announcementName,
      status: caller.deletedAt ? "DELETED" : caller.status,
      deletedAt: caller.deletedAt?.toISOString() ?? null,
      createdAt: caller.createdAt.toISOString(),
    },
    totals: {
      today: todayCount,
      thisMonth: monthCount,
      lifetime: lifetimeCount,
    },
    dailyHistory: dailyRows.map((d) => ({
      businessDateEst: d.businessDateEst,
      leadCount: Number(d.leadCount),
    })),
    monthlyHistory: monthlyRows.map((m) => ({
      businessMonthEst: m.businessMonthEst,
      leadCount: Number(m.leadCount),
    })),
    campaignBreakdown: campaignGroups
      .map((g) => ({
        campaignId: g.campaignId,
        campaignName: campaignMap.get(g.campaignId) ?? "Unknown Campaign",
        leadCount: g._count.id,
      }))
      .sort((a, b) => b.leadCount - a.leadCount),
    recentAnnouncements: recentAnnouncements.map((a) => ({
      id: a.id,
      campaignName: a.campaignNameSnapshot,
      renderedMessage: a.renderedMessage,
      businessDateEst: a.businessDateEst,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function getCampaignHistoryAnalytics(
  campaignId: string
): Promise<CampaignHistoryAnalytics | null> {
  return cached(
    `analytics:campaign:${campaignId}:${getBusinessDateEst()}`,
    30000,
    () => computeCampaignHistoryAnalytics(campaignId)
  );
}

async function computeCampaignHistoryAnalytics(
  campaignId: string
): Promise<CampaignHistoryAnalytics | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return null;

  const now = new Date();
  const todayEst = getBusinessDateEst(now);
  const monthEst = getBusinessMonthEst(now);

  const [
    todayCount,
    monthCount,
    lifetimeCount,
    dailyRows,
    monthlyRows,
    targetHistory,
    callerGroups,
    users,
  ] = await Promise.all([
    prisma.leadAnnouncement.count({ where: { campaignId, businessDateEst: todayEst } }),
    prisma.leadAnnouncement.count({ where: { campaignId, businessMonthEst: monthEst } }),
    prisma.leadAnnouncement.count({ where: { campaignId } }),
    prisma.$queryRaw<Array<{ businessDateEst: string; leadCount: number }>>`
      SELECT "businessDateEst", COUNT(*)::int AS "leadCount"
      FROM "LeadAnnouncement"
      WHERE "campaignId" = ${campaignId}
      GROUP BY "businessDateEst"
      ORDER BY "businessDateEst" DESC
      LIMIT 60
    `,
    prisma.$queryRaw<Array<{ businessMonthEst: string; leadCount: number }>>`
      SELECT "businessMonthEst", COUNT(*)::int AS "leadCount"
      FROM "LeadAnnouncement"
      WHERE "campaignId" = ${campaignId}
      GROUP BY "businessMonthEst"
      ORDER BY "businessMonthEst" DESC
      LIMIT 24
    `,
    prisma.campaignTargetHistory.findMany({
      where: { campaignId },
      orderBy: { effectiveFrom: "desc" },
      include: { changedBy: { select: { fullName: true } } },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["userId"],
      where: { campaignId },
      _count: { id: true },
    }),
    prisma.user.findMany({ select: { id: true, announcementName: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.announcementName]));

  const dailyHistory = await Promise.all(
    dailyRows.map(async (d) => {
      const leadCount = Number(d.leadCount);
      const effectiveTarget = await resolveEffectiveCampaignTargetForDate(
        campaignId,
        d.businessDateEst,
        campaign.dailyTarget
      );
      const achievementPercent =
        effectiveTarget > 0 ? Math.round((leadCount / effectiveTarget) * 100) : 0;
      return {
        businessDateEst: d.businessDateEst,
        leadCount,
        effectiveTarget,
        achievementPercent,
      };
    })
  );

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      dailyTarget: campaign.dailyTarget,
      status: campaign.deletedAt ? "DELETED" : campaign.status,
      deletedAt: campaign.deletedAt?.toISOString() ?? null,
      createdAt: campaign.createdAt.toISOString(),
    },
    totals: {
      today: todayCount,
      thisMonth: monthCount,
      lifetime: lifetimeCount,
    },
    dailyHistory,
    monthlyHistory: monthlyRows.map((m) => ({
      businessMonthEst: m.businessMonthEst,
      leadCount: Number(m.leadCount),
    })),
    targetHistory: targetHistory.map((t) => ({
      id: t.id,
      dailyTarget: t.dailyTarget,
      effectiveDateEst: t.effectiveDateEst,
      effectiveFrom: t.effectiveFrom.toISOString(),
      changedByName: t.changedBy?.fullName ?? null,
    })),
    topCallers: callerGroups
      .map((g) => ({
        userId: g.userId,
        announcementName: userMap.get(g.userId) ?? "Unknown Caller",
        leadCount: g._count.id,
      }))
      .sort((a, b) => b.leadCount - a.leadCount),
  };
}
