"use client";

import React from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
}

export function LeaderboardPanel({
  daily,
  monthly,
  allTime,
  currentUserId,
  businessDateEst,
  businessMonthEst,
  dailyOnly = false,
}: LeaderboardPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            {dailyOnly ? "Today's Leaderboard" : "Team Leaderboards"}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Tie-break: earliest achievement
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {dailyOnly ? (
          <LeaderboardList entries={daily} currentUserId={currentUserId} />
        ) : (
          <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all-time">All-Time</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <p className="mb-3 text-xs text-muted-foreground">
                Daily window: <span className="font-mono">{businessDateEst}</span>
              </p>
              <LeaderboardList entries={daily} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="monthly">
              <p className="mb-3 text-xs text-muted-foreground">
                Monthly window: <span className="font-mono">{businessMonthEst}</span>
              </p>
              <LeaderboardList entries={monthly} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="all-time">
              <p className="mb-3 text-xs text-muted-foreground">
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
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No callers ranked yet for this period.
      </div>
    );
  }

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-3">
      {/* Top 3 Podium Cards */}
      <div className="space-y-2">
        {topThree.map((entry) => {
          const isMe = entry.userId === currentUserId;
          const podiumStyle =
            entry.rank === 1
              ? "border-amber-200 bg-amber-50/40"
              : entry.rank === 2
              ? "border-slate-300 bg-slate-50/80"
              : "border-orange-200 bg-orange-50/35";

          return (
            <div
              key={entry.userId}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
                podiumStyle,
                isMe && "ring-1 ring-primary"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <CrownBadge rank={entry.rank} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {entry.announcementName}
                    </span>
                    {isMe && <Badge variant="default">You</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {entry.achievedAt
                      ? `Reached at ${formatEstTime(entry.achievedAt)} EST`
                      : "No leads yet"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-bold tabular-nums text-slate-900">
                  {entry.leadCount}
                </span>
                <span className="ml-1 text-xs text-slate-500">
                  {entry.leadCount === 1 ? "lead" : "leads"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining Rankings */}
      {rest.length > 0 && (
        <div className="divide-y rounded-lg border bg-white">
          {rest.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm",
                  isMe && "bg-blue-50/60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CrownBadge rank={entry.rank} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">
                        {entry.announcementName}
                      </span>
                      {isMe && <Badge variant="outline">You</Badge>}
                    </div>
                    {entry.achievedAt && (
                      <p className="text-xs text-slate-500">
                        Last at {formatEstTime(entry.achievedAt)} EST
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-semibold tabular-nums text-slate-800 shrink-0">
                  {entry.leadCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
