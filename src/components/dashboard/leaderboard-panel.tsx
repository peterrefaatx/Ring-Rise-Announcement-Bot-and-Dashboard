"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Clock,
  FlaskConical,
  Flower2,
  Gamepad2,
  Info,
  Laugh,
  Music2,
} from "lucide-react";
import { RiVipCrown2Fill } from "react-icons/ri";
import { FaFireFlameCurved } from "react-icons/fa6";
import { BsLightningChargeFill } from "react-icons/bs";
import { TbTargetArrow } from "react-icons/tb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrownBadge } from "@/components/crown-badge";
import { useTheme } from "@/components/theme-provider";
import type { LeaderboardBadgeId, LeaderboardEntry } from "@/lib/leaderboard";
import type { ThemeId } from "@/lib/themes";
import { formatEstTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const RANK_POPUP_BY_THEME: Record<
  ThemeId,
  {
    Icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  classic: {
    Icon: ArrowUp,
    className:
      "rounded-full bg-gradient-to-r from-[#0077B6] to-[#0EA5E9] text-white shadow-md ring-2 ring-white/85",
  },
  dark: {
    Icon: ArrowUp,
    className:
      "rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-[0_6px_18px_rgba(56,189,248,0.4)] ring-2 ring-slate-900/70",
  },
  music: {
    Icon: Music2,
    className:
      "rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-[0_6px_18px_rgba(236,72,153,0.45)] ring-2 ring-white/25",
  },
  gaming: {
    Icon: Gamepad2,
    className:
      "rounded-full bg-gradient-to-r from-[#00E599] to-cyan-400 text-[#070B12] shadow-[0_6px_18px_rgba(0,229,153,0.4)] ring-2 ring-[#070B12]/70",
  },
  blush: {
    Icon: Flower2,
    className:
      "rounded-full bg-gradient-to-r from-[#E11D74] to-[#F472B6] text-white shadow-[0_6px_16px_rgba(225,29,116,0.32)] ring-2 ring-white/90",
  },
  meme: {
    Icon: Laugh,
    className:
      "rounded-full border-2 border-[#0D0F14] bg-gradient-to-r from-lime-400 to-yellow-400 text-[#0D0F14] shadow-[2px_2px_0px_#0D0F14]",
  },
  "breaking-bad": {
    Icon: FlaskConical,
    className:
      "rounded-md border border-yellow-400/80 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-[0_6px_18px_rgba(34,197,94,0.4)] ring-1 ring-black/40",
  },
};

const BADGE_VISUALS: Record<
  LeaderboardBadgeId,
  {
    Icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
  }
> = {
  "throne-stealer": {
    Icon: RiVipCrown2Fill,
    iconClass: "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]",
  },
  "on-fire": {
    Icon: FaFireFlameCurved,
    iconClass: "text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.35)]",
  },
  "speed-demon": {
    Icon: BsLightningChargeFill,
    iconClass: "text-sky-500 drop-shadow-[0_0_6px_rgba(14,165,233,0.35)]",
  },
  "first-blood": {
    Icon: TbTargetArrow,
    iconClass: "text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.35)]",
  },
};

interface LeaderboardPanelProps {
  daily: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  currentUserId: string;
  dailyOnly?: boolean;
  hideTitle?: boolean;
  showTiebreaker?: boolean;
}

export function LeaderboardPanel({
  daily,
  monthly,
  allTime,
  currentUserId,
  dailyOnly = false,
  hideTitle = false,
  showTiebreaker = true,
}: LeaderboardPanelProps) {
  const [tiebreakerOpen, setTiebreakerOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      {!hideTitle && (
        <CardHeader className="border-b border-[#E3E8EE] bg-[#FAFBFD] px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              {dailyOnly ? "Today's Leaderboard" : "Team Leaderboards"}
            </CardTitle>
            {showTiebreaker && (
              <div
                className="relative group"
                onMouseLeave={() => setTiebreakerOpen(false)}
              >
                <button
                  type="button"
                  aria-label="Tiebreaker rule"
                  aria-expanded={tiebreakerOpen}
                  onClick={() => setTiebreakerOpen((prev) => !prev)}
                  onBlur={() => setTiebreakerOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-muted/80 hover:text-[#0A2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-4 w-4" />
                </button>
                <div
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute right-0 top-full z-30 mt-2 w-60 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg transition-all duration-150",
                    tiebreakerOpen
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  )}
                >
                  <span className="font-semibold text-foreground">Tiebreaker:</span> Earliest time to reach the lead count ranks first.
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("p-0", !hideTitle && !dailyOnly && "pt-4 px-5 pb-5")}>
        {dailyOnly ? (
          <LeaderboardList
            entries={daily}
            currentUserId={currentUserId}
            flush
          />
        ) : (
          <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all-time">All-Time</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-3">
              <LeaderboardList entries={daily} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="monthly" className="mt-3">
              <LeaderboardList entries={monthly} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="all-time" className="mt-3">
              <LeaderboardList entries={allTime} currentUserId={currentUserId} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <div
        aria-hidden="true"
        className="h-10 border-t border-[#E3E8EE] bg-[#FAFBFD]"
      />
    </Card>
  );
}

export function LeaderboardList({
  entries,
  currentUserId,
  flush = false,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  flush?: boolean;
}) {
  const { themeId } = useTheme();
  const popupVariant = RANK_POPUP_BY_THEME[themeId] ?? RANK_POPUP_BY_THEME.classic;
  const PopupIcon = popupVariant.Icon;
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevTopsRef = useRef<Map<string, number>>(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const prevOrderRef = useRef<string[]>([]);
  const [climbedIds, setClimbedIds] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Automatically clear time-windowed badges (On Fire / Throne Stealer) when they expire
  useEffect(() => {
    const current = Date.now();
    setNowMs(current);
    let nextExpiry = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
      for (const badge of entry.badges ?? []) {
        if (!badge.expiresAt) continue;
        const expiryMs = Date.parse(badge.expiresAt);
        if (Number.isFinite(expiryMs) && expiryMs > current && expiryMs < nextExpiry) {
          nextExpiry = expiryMs;
        }
      }
    }
    if (!Number.isFinite(nextExpiry)) return;
    const delay = Math.max(50, Math.min(nextExpiry - current + 50, 2_147_483_647));
    const timer = setTimeout(() => setNowMs(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [entries]);

  useLayoutEffect(() => {
    const nextTops = new Map<string, number>();
    const nextRanks = new Map<string, number>();
    const nextOrder = entries.map((e) => e.userId);
    const newlyClimbed: Record<string, number> = {};
    const prevOrder = prevOrderRef.current;
    const isInitial = prevTopsRef.current.size === 0 || prevOrder.length === 0;
    const isTabVisible =
      typeof document === "undefined" || document.visibilityState === "visible";
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orderChanged =
      prevOrder.length !== nextOrder.length ||
      prevOrder.some((id, idx) => id !== nextOrder[idx]);

    for (const entry of entries) {
      const el = rowRefs.current.get(entry.userId);
      if (!el) continue;

      const prevRank = prevRanksRef.current.get(entry.userId);
      nextRanks.set(entry.userId, entry.rank);
      if (!isInitial && prevRank !== undefined && entry.rank < prevRank) {
        newlyClimbed[entry.userId] = prevRank - entry.rank;
      }

      // Clear any leftover FLIP transform/layer hints when tab is hidden or inactive
      if (!isTabVisible || el.offsetParent === null) {
        el.style.transition = "";
        el.style.transform = "";
        el.style.zIndex = "";
        el.style.willChange = "";
        continue;
      }

      const currentTop = el.offsetTop;
      nextTops.set(entry.userId, currentTop);

      if (isInitial || !orderChanged || prefersReducedMotion) continue;

      const prevTop = prevTopsRef.current.get(entry.userId);
      if (prevTop !== undefined) {
        const deltaY = prevTop - currentTop;
        if (Math.abs(deltaY) > 1) {
          const movedUp = deltaY > 0;
          el.style.willChange = "transform";
          el.style.transition = "none";
          el.style.transform = `translateY(${deltaY}px)`;
          el.style.zIndex = movedUp ? "10" : "1";

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition =
                "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease";
              el.style.transform = "translateY(0)";
            });
          });
        }
      }
    }

    prevTopsRef.current = nextTops;
    prevRanksRef.current = nextRanks;
    prevOrderRef.current = nextOrder;

    if (isTabVisible && Object.keys(newlyClimbed).length > 0) {
      setClimbedIds(newlyClimbed);
    }
  }, [entries]);

  useEffect(() => {
    if (Object.keys(climbedIds).length === 0) return;
    const timer = setTimeout(() => setClimbedIds({}), 1500);
    return () => clearTimeout(timer);
  }, [climbedIds]);

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[#64748B]">
        No callers ranked yet for this period. Announce a lead to take #1.
      </div>
    );
  }

  const countFrequency = new Map<number, number>();
  for (const entry of entries) {
    if (entry.leadCount > 0) {
      countFrequency.set(entry.leadCount, (countFrequency.get(entry.leadCount) ?? 0) + 1);
    }
  }

  return (
    <div
      className={cn(
        "divide-y divide-[#E3E8EE]",
        !flush && "rounded-lg border border-[#E3E8EE] overflow-hidden"
      )}
    >
      {entries.map((entry) => {
        const isMe = entry.userId === currentUserId;
        const isTop1 = entry.rank === 1 && entry.leadCount > 0;
        const isTop3 = entry.rank <= 3 && entry.leadCount > 0;
        const rankDelta = climbedIds[entry.userId] ?? 0;
        const isTied = entry.leadCount > 0 && (countFrequency.get(entry.leadCount) ?? 0) > 1;
        const activeBadges = (entry.badges ?? []).filter(
          (badge) => !badge.expiresAt || Date.parse(badge.expiresAt) > nowMs
        );

        return (
          <div
            key={entry.userId}
            ref={(el) => {
              if (el) {
                rowRefs.current.set(entry.userId, el);
              } else {
                rowRefs.current.delete(entry.userId);
              }
            }}
            onTransitionEnd={(e) => {
              if (e.propertyName === "transform") {
                e.currentTarget.style.zIndex = "";
                e.currentTarget.style.transition = "";
                e.currentTarget.style.transform = "";
                e.currentTarget.style.willChange = "";
              }
            }}
            className={cn(
              "relative flex flex-wrap min-h-[76px] sm:min-h-[84px] items-center justify-between gap-x-3 gap-y-2 px-4 py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:px-5 sm:py-6 transition-colors",
              isTop1 && "bg-amber-50/45",
              !isTop1 && isMe && "bg-[#0077B6]/[0.04]",
              !isTop1 && !isMe && "hover:bg-[#F8FAFC]",
              rankDelta > 0 && "animate-rank-climb"
            )}
          >
            {rankDelta > 0 && (
              <div
                aria-live="polite"
                className={cn(
                  "animate-rank-popup pointer-events-none absolute right-4 top-1.5 z-20 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold sm:right-5",
                  popupVariant.className
                )}
              >
                <PopupIcon className="h-3 w-3 stroke-[2.5]" />
                <span>+{rankDelta}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 sm:flex-initial sm:justify-self-start">
              <CrownBadge rank={entry.rank} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={cn(
                      "truncate text-[15px] sm:text-base text-[#0A2540]",
                      isTop3 ? "font-semibold" : "font-medium"
                    )}
                  >
                    {entry.fullName}
                  </span>
                  {isMe && (
                    <span className="inline-flex items-center rounded-full bg-[#0077B6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0077B6]">
                      You
                    </span>
                  )}
                  {isTied && entry.achievedAt && (
                    <span
                      title="Tiebreaker timestamp (EST)"
                      className="inline-flex items-center gap-1 rounded-full border border-[#E3E8EE] bg-[#FAFBFD] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#64748B] shrink-0"
                    >
                      <Clock className="h-3 w-3" />
                      {formatEstTime(entry.achievedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeBadges.length > 0 ? (
              <div className="order-3 flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:order-none sm:w-auto sm:justify-self-center">
                {activeBadges.map((badge, index) => {
                  const visual = BADGE_VISUALS[badge.id];
                  const BadgeIcon = visual.Icon;
                  return (
                    <React.Fragment key={badge.id}>
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className="h-3 w-px shrink-0 bg-border"
                        />
                      )}
                      <span
                        title={badge.tooltip}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#425466] select-none shrink-0"
                      >
                        <BadgeIcon className={cn("h-3.5 w-3.5 shrink-0", visual.iconClass)} />
                        <span>{badge.label}</span>
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden="true" />
            )}

            <div className="flex items-baseline gap-1.5 shrink-0 sm:justify-self-end">
              <span
                className={cn(
                  "tabular-nums tracking-tight text-[#0A2540]",
                  isTop3 ? "text-xl font-bold" : "text-base font-semibold"
                )}
              >
                {entry.leadCount}
              </span>
              <span className="text-xs font-medium text-[#64748B]">
                {entry.leadCount === 1 ? "lead" : "leads"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
