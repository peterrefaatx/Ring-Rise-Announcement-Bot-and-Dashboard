"use client";

import React, { useState } from "react";
import { ShieldCheck, Users, Target, CalendarDays, Flame } from "lucide-react";
import { AppShell, type AppShellUser } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel";
import { CampaignProgressPanel } from "@/components/dashboard/campaign-progress-panel";
import { ActivityFeedPanel } from "@/components/dashboard/activity-feed-panel";
import { AdminCallersTab } from "./admin-callers-tab";
import { AdminCampaignsTab } from "./admin-campaigns-tab";
import { AdminAnalyticsTab } from "./admin-analytics-tab";
import { AdminSettingsTab } from "./admin-settings-tab";

export function AdminPortal({
  initialSnapshot,
  user,
}: {
  initialSnapshot: DashboardSnapshot;
  user: AppShellUser;
}) {
  const { snapshot, connectionState, refreshNow } = useRealtimeDashboard(initialSnapshot);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  function handleInspectCaller(callerId: string) {
    setSelectedCallerId(callerId);
    setActiveTab("analytics");
  }

  function handleInspectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);
    setActiveTab("analytics");
  }

  return (
    <AppShell
      user={user}
      brand={snapshot.brand}
      businessDateEst={snapshot.businessDateEst}
      connectionState={connectionState}
      onManualRefresh={refreshNow}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Administration Console
            </h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="callers">Callers</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Exports</TabsTrigger>
            <TabsTrigger value="settings">Telegram & Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>LEADS TODAY</span>
                    <Flame className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {snapshot.totals.leadsToday}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {snapshot.totals.overallDailyProgressPercent}% of {snapshot.totals.overallDailyTarget} daily target
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>LEADS THIS MONTH</span>
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {snapshot.totals.leadsThisMonth}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Lifetime total: {snapshot.totals.leadsAllTime}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>ACTIVE CALLERS</span>
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {snapshot.totals.activeCallers}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Currently enabled caller accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>ACTIVE CAMPAIGNS</span>
                    <Target className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {snapshot.totals.activeCampaigns}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Combined daily target: {snapshot.totals.overallDailyTarget}
                  </p>
                </CardContent>
              </Card>
            </div>

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
          </TabsContent>

          <TabsContent value="callers">
            <AdminCallersTab
              currentUserId={user.id}
              refreshSignal={snapshot.latestEventSeq}
              onInspectCaller={handleInspectCaller}
            />
          </TabsContent>

          <TabsContent value="campaigns">
            <AdminCampaignsTab
              refreshSignal={snapshot.latestEventSeq}
              onInspectCampaign={handleInspectCampaign}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsTab
              defaultDateEst={snapshot.businessDateEst}
              defaultMonthEst={snapshot.businessMonthEst}
              selectedCallerId={selectedCallerId}
              selectedCampaignId={selectedCampaignId}
              onSelectCallerId={setSelectedCallerId}
              onSelectCampaignId={setSelectedCampaignId}
            />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettingsTab
              refreshSignal={snapshot.latestEventSeq}
              onSettingsSaved={refreshNow}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
