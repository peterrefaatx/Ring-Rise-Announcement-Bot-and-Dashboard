"use client";

import React, { useState } from "react";
import { Megaphone, Award, CalendarDays, Flame, Users } from "lucide-react";
import { AppShell, type AppShellUser } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { AnnounceLeadDialog } from "./announce-lead-dialog";
import { LeaderboardPanel } from "./leaderboard-panel";
import { CampaignProgressPanel } from "./campaign-progress-panel";
import { ActivityFeedPanel } from "./activity-feed-panel";

interface CallerDashboardProps {
  initialSnapshot: DashboardSnapshot;
  user: AppShellUser & {
    announcementTemplate: string;
  };
}

export function CallerDashboard({ initialSnapshot, user }: CallerDashboardProps) {
  const { snapshot, connectionState, refreshNow } = useRealtimeDashboard(initialSnapshot);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const leaderToday = snapshot.leaderboards.daily[0];
  const gapToFirst =
    leaderToday && snapshot.personal.dailyRank && snapshot.personal.dailyRank > 1
      ? Math.max(0, leaderToday.leadCount - snapshot.personal.leadsToday)
      : 0;

  return (
    <AppShell
      user={user}
      brand={snapshot.brand}
      businessDateEst={snapshot.businessDateEst}
      connectionState={connectionState}
      onManualRefresh={refreshNow}
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Performance Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Announcing as{" "}
              <span className="font-medium text-slate-800">{user.announcementName}</span> ·
              Team total today:{" "}
              <span className="font-semibold text-slate-900">
                {snapshot.totals.leadsToday}
              </span>
              {snapshot.totals.overallDailyTarget > 0 && (
                <span> / {snapshot.totals.overallDailyTarget} target leads</span>
              )}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto font-semibold shadow-sm"
            onClick={() => setAnnounceOpen(true)}
          >
            <Megaphone className="h-4 w-4" />
            ANNOUNCE LEAD
          </Button>
        </div>

        {/* Personal & Team KPI Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>MY LEADS TODAY</span>
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {snapshot.personal.leadsToday}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {snapshot.personal.dailyRank === 1 && snapshot.personal.leadsToday > 0
                  ? "Currently #1 on today's board"
                  : gapToFirst > 0
                  ? `${gapToFirst} behind #1 (${leaderToday?.announcementName})`
                  : "Announce a lead to climb the board"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>DAILY RANKING</span>
                <Award className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {snapshot.personal.dailyRank ? `#${snapshot.personal.dailyRank}` : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Out of {snapshot.personal.totalCallersRankedToday} ranked callers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>MY MONTHLY LEADS</span>
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {snapshot.personal.leadsThisMonth}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Monthly rank:{" "}
                {snapshot.personal.monthlyRank ? `#${snapshot.personal.monthlyRank}` : "—"} ·
                All-time: {snapshot.personal.leadsAllTime}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>TEAM DAILY PROGRESS</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {snapshot.totals.overallDailyProgressPercent}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {snapshot.totals.leadsToday} / {snapshot.totals.overallDailyTarget} across{" "}
                {snapshot.totals.activeCampaigns} active campaigns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <CampaignProgressPanel campaigns={snapshot.campaigns} />
            <ActivityFeedPanel items={snapshot.activityFeed} />
          </div>

          <div className="lg:col-span-5">
            <LeaderboardPanel
              daily={snapshot.leaderboards.daily}
              monthly={snapshot.leaderboards.monthly}
              allTime={snapshot.leaderboards.allTime}
              currentUserId={user.id}
              businessDateEst={snapshot.businessDateEst}
              businessMonthEst={snapshot.businessMonthEst}
            />
          </div>
        </div>
      </div>

      <AnnounceLeadDialog
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        campaigns={snapshot.campaigns}
        announcementName={user.announcementName}
        announcementTemplate={user.announcementTemplate}
        onSuccess={refreshNow}
      />
    </AppShell>
  );
}
