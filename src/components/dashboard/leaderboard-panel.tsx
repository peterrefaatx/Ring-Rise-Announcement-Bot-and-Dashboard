"use client";

import React from "react";
import { Trophy } from "lucide-react";
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
}

export function LeaderboardPanel({
  daily,
  monthly,
  allTime,
  currentUserId,
  businessDateEst,
  businessMonthEst,
  dailyOnly = false,
  hideTitle = false,
}: LeaderboardPanelProps) {
  return (
    <Card className="overflow-hidden">
      {!hideTitle && (
        <CardHeader className="border-b border-[#E3E8EE] bg-[#FAFBFD] pb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              {dailyOnly ? "Today's Leaderboard" : "Team Leaderboards"}
            </CardTitle>
            <span className="text-xs text-[#64748B]">
              Earliest achievement breaks ties
            </span>
          </div>
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

            <TabsContent value="daily">
              <p className="mb-3 text-xs text-[#64748B]">
                Daily window: <span className="font-mono">{businessDateEst}</span>
              </p>
              <LeaderboardList entries={daily} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="monthly">
              <p className="mb-3 text-xs text-[#64748B]">
                Monthly window: <span className="font-mono">{businessMonthEst}</span>
              </p>
              <LeaderboardList entries={monthly} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="all-time">
              <p className="mb-3 text-xs text-[#64748B]">
                Cumulative lifetime rankings
              </p>
              <LeaderboardList entries={allTime} currentUserId={currentUserId} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
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
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-[#64748B]">
        No callers ranked yet for this period. Announce a lead to take #1.
      </div>
    );
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

        return (
          <div
            key={entry.userId}
            className={cn(
              "flex items-center justify-between gap-4 px-5 py-3.5 transition-colors",
              isTop1 && "bg-amber-50/45",
              !isTop1 && isMe && "bg-[#0077B6]/[0.04]",
              !isTop1 && !isMe && "hover:bg-[#F8FAFC]"
            )}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CrownBadge rank={entry.rank} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm text-[#0A2540]",
                      isTop3 ? "font-semibold" : "font-medium"
                    )}
                  >
                    {entry.announcementName}
                  </span>
                  {isMe && (
                    <span className="inline-flex items-center rounded-full bg-[#0077B6]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0077B6]">
                      You
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  {entry.achievedAt
                    ? `Reached at ${formatEstTime(entry.achievedAt)}`
                    : "No leads yet"}
                </p>
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
