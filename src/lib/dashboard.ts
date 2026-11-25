import { prisma } from "./db";
import { getCurrentLeaderboards, type LeaderboardEntry } from "./leaderboard";
import {
  EST_TIMEZONE_LABEL,
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
  getEstMonthRangeUtc,
} from "./timezone";

export interface CampaignProgressItem {
  id: string;
  name: string;
  description: string | null;
  dailyTarget: number;
  status: string;
  leadsToday: number;
  progressPercent: number;
  targetReached: boolean;
}

export interface ActivityFeedItem {
  id: string;
  seq: number;
  userId: string;
  callerName: string;
  campaignId: string;
  campaignName: string;
  renderedMessage: string;
  createdAt: string;
  telegramStatus: string | null;
}

export interface BrandSettingsPublic {
  brandName: string;
  brandTagline: string;
  brandPrimaryColor: string;
  brandLogoUrl: string | null;
  timezoneLabel: string;
}

export interface DashboardSnapshot {
  serverTime: string;
  businessDateEst: string;
  businessMonthEst: string;
  latestEventSeq: number;
  brand: BrandSettingsPublic;
  personal: {
    leadsToday: number;
    leadsThisMonth: number;
    leadsAllTime: number;
    dailyRank: number | null;
    monthlyRank: number | null;
    allTimeRank: number | null;
    totalCallersRankedToday: number;
  };
  totals: {
    leadsToday: number;
    leadsThisMonth: number;
    leadsAllTime: number;
    activeCallers: number;
    activeCampaigns: number;
    overallDailyTarget: number;
    overallDailyProgressPercent: number;
  };
  campaigns: CampaignProgressItem[];
  leaderboards: {
    daily: LeaderboardEntry[];
    monthly: LeaderboardEntry[];
    allTime: LeaderboardEntry[];
  };
  activityFeed: ActivityFeedItem[];
}

export async function getPublicBrandSettings(): Promise<BrandSettingsPublic> {
  let settings: {
    brandName: string;
    brandTagline: string;
    brandPrimaryColor: string;
    brandLogoUrl: string | null;
    timezoneLabel: string;
  } | null = null;

  try {
    settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });
  } catch (err) {
    console.error("getPublicBrandSettings fallback (DB unavailable):", err);
  }

  return {
    brandName: settings?.brandName || process.env.BRAND_NAME || "Daily Dashboard",
    brandTagline:
      settings?.brandTagline ||
      process.env.BRAND_TAGLINE ||
      "Real-Time Lead & Campaign Tracker",
    brandPrimaryColor:
      settings?.brandPrimaryColor || process.env.BRAND_PRIMARY_COLOR || "#0077B6",
    brandLogoUrl: settings?.brandLogoUrl || "/logo.png",
    timezoneLabel: settings?.timezoneLabel || EST_TIMEZONE_LABEL,
  };
}

export async function getDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const now = new Date();
  const businessDateEst = getBusinessDateEst(now);
  const businessMonthEst = getBusinessMonthEst(now);
  const dayRange = getEstDayRangeUtc(businessDateEst);
  const monthRange = getEstMonthRangeUtc(businessMonthEst);

  const [
    brand,
    leaderboards,
    activeCampaigns,
    campaignCountsToday,
    recentLeads,
    totalLeadsToday,
    totalLeadsMonth,
    totalLeadsAllTime,
    activeCallerCount,
    latestEvent,
  ] = await Promise.all([
    getPublicBrandSettings(),
    getCurrentLeaderboards(now),
    prisma.campaign.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: {
        createdAt: { gte: dayRange.startUtc, lt: dayRange.endUtc },
      },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        telegramJob: {
          select: { status: true },
        },
      },
    }),
    prisma.leadAnnouncement.count({
      where: {
        createdAt: { gte: dayRange.startUtc, lt: dayRange.endUtc },
      },
    }),
    prisma.leadAnnouncement.count({
      where: {
        createdAt: { gte: monthRange.startUtc, lt: monthRange.endUtc },
      },
    }),
    prisma.leadAnnouncement.count(),
    prisma.user.count({
      where: { role: "CALLER", status: "ACTIVE", deletedAt: null },
    }),
    prisma.activityEvent.findFirst({
      orderBy: { seq: "desc" },
      select: { seq: true },
    }),
  ]);

  const campaignCountMap = new Map(
    campaignCountsToday.map((item) => [item.campaignId, item._count.id])
  );

  const campaigns: CampaignProgressItem[] = activeCampaigns.map((c) => {
    const leadsToday = campaignCountMap.get(c.id) ?? 0;
    const rawPct = c.dailyTarget > 0 ? Math.round((leadsToday / c.dailyTarget) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      dailyTarget: c.dailyTarget,
      status: c.status,
      leadsToday,
      progressPercent: Math.min(100, rawPct),
      targetReached: leadsToday >= c.dailyTarget,
    };
  });

  const overallDailyTarget = campaigns.reduce((sum, c) => sum + c.dailyTarget, 0);
  const overallDailyProgressPercent =
    overallDailyTarget > 0
      ? Math.min(100, Math.round((totalLeadsToday / overallDailyTarget) * 100))
      : 0;

  const dailyEntry = leaderboards.daily.find((e) => e.userId === userId);
  const monthlyEntry = leaderboards.monthly.find((e) => e.userId === userId);
  const allTimeEntry = leaderboards.allTime.find((e) => e.userId === userId);

  return {
    serverTime: now.toISOString(),
    businessDateEst,
    businessMonthEst,
    latestEventSeq: latestEvent?.seq ?? 0,
    brand,
    personal: {
      leadsToday: dailyEntry?.leadCount ?? 0,
      leadsThisMonth: monthlyEntry?.leadCount ?? 0,
      leadsAllTime: allTimeEntry?.leadCount ?? 0,
      dailyRank: dailyEntry ? dailyEntry.rank : null,
      monthlyRank: monthlyEntry ? monthlyEntry.rank : null,
      allTimeRank: allTimeEntry ? allTimeEntry.rank : null,
      totalCallersRankedToday: leaderboards.daily.length,
    },
    totals: {
      leadsToday: totalLeadsToday,
      leadsThisMonth: totalLeadsMonth,
      leadsAllTime: totalLeadsAllTime,
      activeCallers: activeCallerCount,
      activeCampaigns: activeCampaigns.length,
      overallDailyTarget,
      overallDailyProgressPercent,
    },
    campaigns,
    leaderboards: {
      daily: leaderboards.daily,
      monthly: leaderboards.monthly,
      allTime: leaderboards.allTime,
    },
    activityFeed: recentLeads.map((item) => ({
      id: item.id,
      seq: item.seq,
      userId: item.userId,
      callerName: item.callerNameSnapshot,
      campaignId: item.campaignId,
      campaignName: item.campaignNameSnapshot,
      renderedMessage: item.renderedMessage,
      createdAt: item.createdAt.toISOString(),
      telegramStatus: item.telegramJob?.status ?? null,
    })),
  };
}
