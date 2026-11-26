"use client";

import React, { useState } from "react";
import {
  Users,
  Target,
  CalendarDays,
  Flame,
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
}> = [
  { id: "overview", label: "Overview" },
  { id: "callers", label: "Callers" },
  { id: "campaigns", label: "Campaigns" },
  { id: "analytics", label: "Analytics & Exports" },
  { id: "settings", label: "Telegram & Settings" },
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
  const [visitedSections, setVisitedSections] = useState<Record<AdminSection, boolean>>({
    overview: true,
    callers: false,
    campaigns: false,
    analytics: false,
    settings: false,
  });
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  function selectSection(section: AdminSection) {
    setVisitedSections((prev) => (prev[section] ? prev : { ...prev, [section]: true }));
    setActiveSection(section);
  }

  function handleInspectCaller(callerId: string) {
    setSelectedCallerId(callerId);
    selectSection("analytics");
  }

  function handleInspectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);
    selectSection("analytics");
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
          {/* Fixed In-Page Sidebar Navigation aligned to normal page width (No Container) */}
          <aside className="w-full lg:fixed lg:top-[104px] lg:z-20 lg:w-56">
            <nav
              aria-label="Administration sections"
              className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSection(item.id)}
                    className={cn(
                      "flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-all duration-200 text-left",
                      active
                        ? "bg-primary/15 font-semibold text-primary shadow-sm"
                        : "font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Section Content (kept mounted after first visit for instant tab switching) */}
          <div className="flex-1 min-w-0 lg:pl-64">
            <div className={activeSection === "overview" ? "animate-nav-enter" : "hidden"}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500">
                        <span>LEADS TODAY</span>
                        <Flame className="h-4 w-4 text-primary shrink-0" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
                        {snapshot.totals.leadsToday}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {snapshot.totals.overallDailyProgressPercent}% of {snapshot.totals.overallDailyTarget} daily target
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500">
                        <span>LEADS THIS MONTH</span>
                        <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
                        {snapshot.totals.leadsThisMonth}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Lifetime total: {snapshot.totals.leadsAllTime}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500">
                        <span>ACTIVE CALLERS</span>
                        <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
                        {snapshot.totals.activeCallers}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Currently enabled caller accounts
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500">
                        <span>ACTIVE CAMPAIGNS</span>
                        <Target className="h-4 w-4 text-amber-500 shrink-0" />
                      </div>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
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
            </div>

            {visitedSections.callers && (
              <div className={activeSection === "callers" ? "animate-nav-enter" : "hidden"}>
                <AdminCallersTab
                  currentUserId={user.id}
                  isActive={activeSection === "callers"}
                  refreshSignal={snapshot.latestEventSeq}
                  onInspectCaller={handleInspectCaller}
                />
              </div>
            )}

            {visitedSections.campaigns && (
              <div className={activeSection === "campaigns" ? "animate-nav-enter" : "hidden"}>
                <AdminCampaignsTab
                  isActive={activeSection === "campaigns"}
                  refreshSignal={snapshot.latestEventSeq}
                  onInspectCampaign={handleInspectCampaign}
                />
              </div>
            )}

            {visitedSections.analytics && (
              <div className={activeSection === "analytics" ? "animate-nav-enter" : "hidden"}>
                <AdminAnalyticsTab
                  isActive={activeSection === "analytics"}
                  refreshSignal={snapshot.latestEventSeq}
                  defaultDateEst={snapshot.businessDateEst}
                  defaultMonthEst={snapshot.businessMonthEst}
                  selectedCallerId={selectedCallerId}
                  selectedCampaignId={selectedCampaignId}
                  onSelectCallerId={setSelectedCallerId}
                  onSelectCampaignId={setSelectedCampaignId}
                />
              </div>
            )}

            {visitedSections.settings && (
              <div className={activeSection === "settings" ? "animate-nav-enter" : "hidden"}>
                <AdminSettingsTab
                  isActive={activeSection === "settings"}
                  refreshSignal={snapshot.latestEventSeq}
                  onSettingsSaved={refreshNow}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
