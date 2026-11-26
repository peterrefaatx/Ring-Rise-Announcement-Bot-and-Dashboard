"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrownBadge } from "@/components/crown-badge";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { formatEstTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface LeaderboardPanelProps {
  daily: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  currentUserId: string;
  businessDateEst: string;
  businessMonthEst: string;
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
  return (
    <Card className="overflow-hidden">
      {!hideTitle && (
        <CardHeader className="border-b border-[#E3E8EE] bg-[#FAFBFD] pb-3.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            {dailyOnly ? "Today's Leaderboard" : "Team Leaderboards"}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("p-0", !hideTitle && "pt-4 px-5 pb-5")}>
        {dailyOnly ? (
          <LeaderboardList
            entries={daily}
            currentUserId={currentUserId}
            flush={hideTitle}
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
      {showTiebreaker && (
        <div className="flex items-center gap-2 border-t border-[#E3E8EE] bg-[#FAFBFD] px-4 py-2.5 text-xs text-[#64748B] sm:px-5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-[#0A2540]">Tiebreaker:</span> Earliest time to reach the lead count ranks first
          </span>
        </div>
      )}
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
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevTopsRef = useRef<Map<string, number>>(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [climbedIds, setClimbedIds] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const nextTops = new Map<string, number>();
    const nextRanks = new Map<string, number>();
    const newlyClimbed: Record<string, number> = {};
    const isInitial = prevTopsRef.current.size === 0;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const entry of entries) {
      const el = rowRefs.current.get(entry.userId);
      if (!el) continue;

      const currentTop = el.getBoundingClientRect().top;
      nextTops.set(entry.userId, currentTop);
      nextRanks.set(entry.userId, entry.rank);

      if (isInitial) continue;

      const prevTop = prevTopsRef.current.get(entry.userId);
      const prevRank = prevRanksRef.current.get(entry.userId);
      if (prevRank !== undefined && entry.rank < prevRank) {
        newlyClimbed[entry.userId] = prevRank - entry.rank;
      }

      if (!prefersReducedMotion && prevTop !== undefined) {
        const deltaY = prevTop - currentTop;
        if (Math.abs(deltaY) > 1) {
          const movedUp = deltaY > 0;
          el.style.transition = "none";
          el.style.transform = `translateY(${deltaY}px)`;
          el.style.zIndex = movedUp ? "10" : "1";
          el.style.position = "relative";

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

    if (Object.keys(newlyClimbed).length > 0) {
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
              }
            }}
            className={cn(
              "relative flex min-h-[76px] sm:min-h-[84px] items-center justify-between gap-3 px-4 py-5 sm:gap-4 sm:px-5 sm:py-6 transition-colors will-change-transform",
              isTop1 && "bg-amber-50/45",
              !isTop1 && isMe && "bg-[#0077B6]/[0.04]",
              !isTop1 && !isMe && "hover:bg-[#F8FAFC]",
              rankDelta > 0 && "animate-rank-climb"
            )}
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <CrownBadge rank={entry.rank} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
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
                  {rankDelta > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ArrowUp className="h-2.5 w-2.5" />
                      {rankDelta}
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

            <div className="flex items-baseline gap-1.5 shrink-0">
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
