import { prisma } from "./db";
import {
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
  getEstMonthRangeUtc,
} from "./timezone";

export type LeaderboardBadgeId =
  | "throne-stealer"
  | "on-fire"
  | "speed-demon"
  | "first-blood";

export type LeaderboardBadgeTone = "royal" | "hot" | "bolt" | "target";

export interface LeaderboardBadge {
  id: LeaderboardBadgeId;
  emoji: string;
  label: string;
  tooltip: string;
  tone: LeaderboardBadgeTone;
  expiresAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  announcementName: string;
  fullName: string;
  status: string;
  leadCount: number;
  achievedAt: string | null;
  achievedSeq: number | null;
  badges?: LeaderboardBadge[];
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

interface UserSummaryRow {
  id: string;
  fullName: string;
  announcementName: string;
  role: string;
  status: string;
  deletedAt: Date | null;
}

function buildRankedLeaderboard(
  aggregates: AggregatedLeadRow[],
  users: UserSummaryRow[],
  includeZeroLeadActiveCallers?: boolean
): LeaderboardEntry[] {
  const aggMap = new Map(aggregates.map((row) => [row.userId, row]));
  const rawRows: RawLeaderboardRow[] = [];

  for (const user of users) {
    if (user.role !== "CALLER") {
      continue;
    }
    const agg = aggMap.get(user.id);
    const hasLeads = agg && agg.leadCount > 0;
    const isActiveCaller = user.status === "ACTIVE" && user.deletedAt === null;

    if (hasLeads || (includeZeroLeadActiveCallers && isActiveCaller)) {
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

  return buildRankedLeaderboard(
    aggregates,
    users,
    options.includeZeroLeadActiveCallers
  );
}

const ON_FIRE_WINDOW_MS = 60 * 60 * 1000;
const THRONE_STEALER_WINDOW_MS = 15 * 60 * 1000;

export interface DailyLeadBadgeEvent {
  userId: string;
  createdAt: Date | string;
  seq: number;
}

function formatDurationCompact(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.round(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Computes competitive live daily badges for callers on Today's leaderboard.
 * Callers can earn and stack multiple active badges simultaneously.
 */
export function attachDailyLeaderboardBadges(
  entries: LeaderboardEntry[],
  events: DailyLeadBadgeEvent[],
  nowMs: number = Date.now()
): LeaderboardEntry[] {
  if (entries.length === 0 || events.length === 0) {
    return entries;
  }

  const rankedSet = new Set(entries.map((e) => e.userId));
  const sortedEvents = [...events]
    .map((ev) => ({
      userId: ev.userId,
      ms: ev.createdAt instanceof Date ? ev.createdAt.getTime() : new Date(ev.createdAt).getTime(),
      seq: ev.seq,
    }))
    .filter((ev) => rankedSet.has(ev.userId) && Number.isFinite(ev.ms))
    .sort((a, b) => (a.ms !== b.ms ? a.ms - b.ms : a.seq - b.seq));

  if (sortedEvents.length === 0) {
    return entries;
  }

  const badgesByUser = new Map<string, LeaderboardBadge[]>();
  const addBadge = (userId: string, badge: LeaderboardBadge) => {
    const list = badgesByUser.get(userId) ?? [];
    list.push(badge);
    badgesByUser.set(userId, list);
  };

  // Group events per caller and walk running #1 to detect Throne Stealer takeovers
  const timesByUser = new Map<string, number[]>();
  const runningState = new Map<string, RawLeaderboardRow>();
  let currentLeaderId: string | null = null;
  let lastTakeover: { userId: string; stolenAtMs: number } | null = null;

  for (const ev of sortedEvents) {
    const userTimes = timesByUser.get(ev.userId) ?? [];
    userTimes.push(ev.ms);
    timesByUser.set(ev.userId, userTimes);

    const prev = runningState.get(ev.userId);
    runningState.set(ev.userId, {
      userId: ev.userId,
      announcementName: "",
      fullName: "",
      status: "ACTIVE",
      leadCount: (prev?.leadCount ?? 0) + 1,
      achievedAtMs: ev.ms,
      achievedSeq: ev.seq,
    });

    let leaderRow: RawLeaderboardRow | null = null;
    for (const row of runningState.values()) {
      if (!leaderRow || compareLeaderboardRows(row, leaderRow) < 0) {
        leaderRow = row;
      }
    }

    if (leaderRow) {
      if (currentLeaderId !== null && leaderRow.userId !== currentLeaderId) {
        lastTakeover = { userId: leaderRow.userId, stolenAtMs: ev.ms };
      }
      currentLeaderId = leaderRow.userId;
    }
  }

  // 1. Throne Stealer (current #1 took the crown from another caller within 15 min)
  const topEntry = entries[0];
  if (
    topEntry &&
    topEntry.leadCount > 0 &&
    lastTakeover &&
    lastTakeover.userId === topEntry.userId &&
    nowMs - lastTakeover.stolenAtMs < THRONE_STEALER_WINDOW_MS
  ) {
    addBadge(topEntry.userId, {
      id: "throne-stealer",
      emoji: "🦊",
      label: "Throne Stealer",
      tooltip: "Took #1 within the last 15 minutes",
      tone: "royal",
      expiresAt: new Date(lastTakeover.stolenAtMs + THRONE_STEALER_WINDOW_MS).toISOString(),
    });
  }

  // 2. On Fire (2+ leads in the last 60 minutes; expires once fewer than 2 remain in window)
  const onFireCutoff = nowMs - ON_FIRE_WINDOW_MS;
  for (const [userId, timestamps] of timesByUser.entries()) {
    const recent = timestamps.filter((ts) => ts >= onFireCutoff);
    if (recent.length >= 2) {
      const expiresAtMs = recent[recent.length - 2] + ON_FIRE_WINDOW_MS;
      addBadge(userId, {
        id: "on-fire",
        emoji: "🔥",
        label: `On Fire ×${recent.length}`,
        tooltip: `${recent.length} leads in the last 60 minutes`,
        tone: "hot",
        expiresAt: new Date(expiresAtMs).toISOString(),
      });
    }
  }

  // 3. Speed Demon (fastest gap between two consecutive leads today)
  let fastest: { userId: string; gapMs: number; secondMs: number } | null = null;
  for (const [userId, timestamps] of timesByUser.entries()) {
    for (let i = 1; i < timestamps.length; i++) {
      const gapMs = timestamps[i] - timestamps[i - 1];
      if (
        !fastest ||
        gapMs < fastest.gapMs ||
        (gapMs === fastest.gapMs && timestamps[i] < fastest.secondMs)
      ) {
        fastest = { userId, gapMs, secondMs: timestamps[i] };
      }
    }
  }
  if (fastest) {
    addBadge(fastest.userId, {
      id: "speed-demon",
      emoji: "⚡",
      label: "Speed Demon",
      tooltip: `Fastest back-to-back leads today (${formatDurationCompact(fastest.gapMs)})`,
      tone: "bolt",
      expiresAt: null,
    });
  }

  // 4. First Blood (first lead of the EST business day)
  const firstLead = sortedEvents[0];
  addBadge(firstLead.userId, {
    id: "first-blood",
    emoji: "🎯",
    label: "First Blood",
    tooltip: "First lead of the EST day",
    tone: "target",
    expiresAt: null,
  });

  return entries.map((entry) => {
    const badges = badgesByUser.get(entry.userId);
    return badges && badges.length > 0 ? { ...entry, badges } : entry;
  });
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

  // Fetch users once instead of 3 times
  const [users, dailyAgg, monthlyAgg, allTimeAgg, todayLeadEvents] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CALLER" },
      select: {
        id: true,
        fullName: true,
        announcementName: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    }),
    queryPeriodAggregates(dayRange.startUtc, dayRange.endUtc),
    queryPeriodAggregates(monthRange.startUtc, monthRange.endUtc),
    queryPeriodAggregates(),
    prisma.leadAnnouncement.findMany({
      where: {
        createdAt: { gte: dayRange.startUtc, lt: dayRange.endUtc },
      },
      orderBy: [{ createdAt: "asc" }, { seq: "asc" }],
      select: {
        userId: true,
        createdAt: true,
        seq: true,
      },
    }),
  ]);

  const daily = attachDailyLeaderboardBadges(
    buildRankedLeaderboard(dailyAgg, users, true),
    todayLeadEvents,
    now.getTime()
  );

  return {
    businessDateEst,
    businessMonthEst,
    daily,
    monthly: buildRankedLeaderboard(monthlyAgg, users, true),
    allTime: buildRankedLeaderboard(allTimeAgg, users, true),
  };
}
