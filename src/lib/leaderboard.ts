import { prisma } from "./db";
import {
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
  getEstMonthRangeUtc,
} from "./timezone";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  announcementName: string;
  fullName: string;
  status: string;
  leadCount: number;
  achievedAt: string | null;
  achievedSeq: number | null;
}

export interface RawLeaderboardRow {
  userId: string;
  announcementName: string;
  fullName: string;
  status: string;
  leadCount: number;
  achievedAtMs: number | null;
  achievedSeq: number | null;
}

/**
 * Deterministic comparator shared by backend & tests:
 * 1. Higher lead count ranks first.
 * 2. Tie-break: earlier first-achievement timestamp ranks first.
 * 3. Tie-break fallback: earlier announcement sequence ID ranks first.
 * 4. Final deterministic fallback: userId ascending.
 */
export function compareLeaderboardRows(a: RawLeaderboardRow, b: RawLeaderboardRow): number {
  if (a.leadCount !== b.leadCount) {
    return b.leadCount - a.leadCount;
  }
  if (a.leadCount > 0 && b.leadCount > 0) {
    const aTime = a.achievedAtMs ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.achievedAtMs ?? Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    const aSeq = a.achievedSeq ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.achievedSeq ?? Number.MAX_SAFE_INTEGER;
    if (aSeq !== bSeq) {
      return aSeq - bSeq;
    }
  } else {
    const nameOrder = a.fullName.localeCompare(b.fullName);
    if (nameOrder !== 0) {
      return nameOrder;
    }
  }
  return a.userId.localeCompare(b.userId);
}

export function rankLeaderboardRows(rows: RawLeaderboardRow[]): LeaderboardEntry[] {
  const sorted = [...rows].sort(compareLeaderboardRows);
  return sorted.map((row, idx) => ({
    rank: idx + 1,
    userId: row.userId,
    announcementName: row.announcementName,
    fullName: row.fullName,
    status: row.status,
    leadCount: row.leadCount,
    achievedAt: row.achievedAtMs !== null ? new Date(row.achievedAtMs).toISOString() : null,
    achievedSeq: row.achievedSeq,
  }));
}

interface AggregatedLeadRow {
  userId: string;
  leadCount: number;
  achievedAt: Date;
  achievedSeq: number;
}

async function queryPeriodAggregates(
  startUtc?: Date,
  endUtc?: Date
): Promise<AggregatedLeadRow[]> {
  if (startUtc && endUtc) {
    return prisma.$queryRaw<AggregatedLeadRow[]>`
      SELECT
        "userId",
        COUNT(*)::int AS "leadCount",
        MAX("createdAt") AS "achievedAt",
        MAX("seq")::int AS "achievedSeq"
      FROM "LeadAnnouncement"
      WHERE "createdAt" >= ${startUtc} AND "createdAt" < ${endUtc}
      GROUP BY "userId"
    `;
  }

  return prisma.$queryRaw<AggregatedLeadRow[]>`
    SELECT
      "userId",
      COUNT(*)::int AS "leadCount",
      MAX("createdAt") AS "achievedAt",
      MAX("seq")::int AS "achievedSeq"
    FROM "LeadAnnouncement"
    GROUP BY "userId"
  `;
}

export async function getLeaderboardForRange(options: {
  startUtc?: Date;
  endUtc?: Date;
  includeZeroLeadActiveCallers?: boolean;
}): Promise<LeaderboardEntry[]> {
  const [aggregates, users] = await Promise.all([
    queryPeriodAggregates(options.startUtc, options.endUtc),
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        announcementName: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    }),
  ]);

  const aggMap = new Map(aggregates.map((row) => [row.userId, row]));
  const rawRows: RawLeaderboardRow[] = [];

  for (const user of users) {
    if (user.role !== "CALLER") {
      continue;
    }
    const agg = aggMap.get(user.id);
    const hasLeads = agg && agg.leadCount > 0;
    const isActiveCaller =
      user.status === "ACTIVE" && user.deletedAt === null;

    if (hasLeads || (options.includeZeroLeadActiveCallers && isActiveCaller)) {
      rawRows.push({
        userId: user.id,
        announcementName: user.announcementName,
        fullName: user.fullName,
        status: user.deletedAt ? "DELETED" : user.status,
        leadCount: agg ? Number(agg.leadCount) : 0,
        achievedAtMs: agg ? new Date(agg.achievedAt).getTime() : null,
        achievedSeq: agg ? Number(agg.achievedSeq) : null,
      });
    }
  }

  return rankLeaderboardRows(rawRows);
}

export async function getCurrentLeaderboards(now: Date = new Date()): Promise<{
  businessDateEst: string;
  businessMonthEst: string;
  daily: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}> {
  const businessDateEst = getBusinessDateEst(now);
  const businessMonthEst = getBusinessMonthEst(now);
  const dayRange = getEstDayRangeUtc(businessDateEst);
  const monthRange = getEstMonthRangeUtc(businessMonthEst);

  const [daily, monthly, allTime] = await Promise.all([
    getLeaderboardForRange({
      startUtc: dayRange.startUtc,
      endUtc: dayRange.endUtc,
      includeZeroLeadActiveCallers: true,
    }),
    getLeaderboardForRange({
      startUtc: monthRange.startUtc,
      endUtc: monthRange.endUtc,
      includeZeroLeadActiveCallers: true,
    }),
    getLeaderboardForRange({
      includeZeroLeadActiveCallers: true,
    }),
  ]);

  return {
    businessDateEst,
    businessMonthEst,
    daily,
    monthly,
    allTime,
  };
}
