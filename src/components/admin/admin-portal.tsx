"use client";

import React, { useState } from "react";
import {
  Users,
  Target,
  CalendarDays,
  Flame,
  LayoutGrid,
  BarChart3,
  Settings,
} from "lucide-react";
import { AppShell, type AppShellUser } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel";
import { CampaignProgressPanel } from "@/components/dashboard/campaign-progress-panel";
import { ActivityFeedPanel } from "@/components/dashboard/activity-feed-panel";
import { AdminCallersTab } from "./admin-callers-tab";
import { AdminCampaignsTab } from "./admin-campaigns-tab";
import { AdminAnalyticsTab } from "./admin-analytics-tab";
import { AdminSettingsTab } from "./admin-settings-tab";
import { cn } from "@/lib/utils";

type AdminSection = "overview" | "callers" | "campaigns" | "analytics" | "settings";

const ADMIN_NAV_ITEMS: Array<{
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "callers", label: "Callers", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Target },
  { id: "analytics", label: "Analytics & Exports", icon: BarChart3 },
  { id: "settings", label: "Telegram & Settings", icon: Settings },
];

export function AdminPortal({
  initialSnapshot,
  user,
}: {
  initialSnapshot: DashboardSnapshot;
  user: AppShellUser;
}) {
  const { snapshot, connectionState, refreshNow } = useRealtimeDashboard(initialSnapshot);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  function handleInspectCaller(callerId: string) {
    setSelectedCallerId(callerId);
    setActiveSection("analytics");
  }

  function handleInspectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);
    setActiveSection("analytics");
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
        <div className="flex flex-col gap-6 lg:block">
          {/* Fixed In-Page Sidebar Navigation (No Container) */}
          <aside className="w-full lg:fixed lg:left-6 lg:top-24 lg:z-20 lg:w-56">
            <nav
              aria-label="Administration sections"
              className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                      active
                        ? "bg-[#0077B6]/10 font-semibold text-[#0077B6]"
                        : "font-medium text-[#425466] hover:bg-white/70 hover:text-[#0A2540]"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Active Section Content */}
          <div className="flex-1 min-w-0 lg:pl-60">
            {activeSection === "overview" && (
              <div className="space-y-6">
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

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="space-y-6 xl:col-span-7">
                    <CampaignProgressPanel campaigns={snapshot.campaigns} />
                    <ActivityFeedPanel items={snapshot.activityFeed} />
                  </div>
                  <div className="xl:col-span-5">
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
            )}

            {activeSection === "callers" && (
              <AdminCallersTab
                currentUserId={user.id}
                refreshSignal={snapshot.latestEventSeq}
                onInspectCaller={handleInspectCaller}
              />
            )}

            {activeSection === "campaigns" && (
              <AdminCampaignsTab
                refreshSignal={snapshot.latestEventSeq}
                onInspectCampaign={handleInspectCampaign}
              />
            )}

            {activeSection === "analytics" && (
              <AdminAnalyticsTab
                defaultDateEst={snapshot.businessDateEst}
                defaultMonthEst={snapshot.businessMonthEst}
                selectedCallerId={selectedCallerId}
                selectedCampaignId={selectedCampaignId}
                onSelectCallerId={setSelectedCallerId}
                onSelectCampaignId={setSelectedCampaignId}
              />
            )}

            {activeSection === "settings" && (
              <AdminSettingsTab
                refreshSignal={snapshot.latestEventSeq}
                onSettingsSaved={refreshNow}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
