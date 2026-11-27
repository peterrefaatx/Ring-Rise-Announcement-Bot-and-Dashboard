"use client";

import React, { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell, type AppShellUser } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { AnnounceLeadDialog } from "./announce-lead-dialog";
import { LeaderboardPanel } from "./leaderboard-panel";
import { CampaignProgressPanel } from "./campaign-progress-panel";
import { CrownBadge } from "@/components/crown-badge";

interface CallerDashboardProps {
  initialSnapshot: DashboardSnapshot;
  user: AppShellUser & {
    announcementTemplate: string;
  };
}

export function CallerDashboard({ initialSnapshot, user }: CallerDashboardProps) {
  const { snapshot, connectionState, refreshNow } = useRealtimeDashboard(initialSnapshot);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [sendingSummary, setSendingSummary] = useState<"campaigns" | "callers" | null>(
    null
  );

  const isAdmin = user.role === "ADMIN";
  const leaderToday = snapshot.leaderboards.daily[0];
  const gapToFirst =
    leaderToday && snapshot.personal.dailyRank && snapshot.personal.dailyRank > 1
      ? Math.max(0, leaderToday.leadCount - snapshot.personal.leadsToday)
      : 0;

  async function handleSendTelegramSummary(type: "campaigns" | "callers") {
    if (sendingSummary) return;
    setSendingSummary(type);
    try {
      const res = await fetch("/api/telegram/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to send Telegram summary.");
        return;
      }
      toast.success(
        type === "campaigns"
          ? "Campaigns progress sent to Telegram group!"
          : "Callers progress sent to Telegram group!"
      );
    } catch {
      toast.error("Network error while sending Telegram summary.");
    } finally {
      setSendingSummary(null);
    }
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
        {/* Unified Executive Daily Metric Strip */}
        <section className="theme-surface rounded-xl border transition-colors duration-200">
          <div
            className={`grid grid-cols-1 divide-y divide-border ${
              isAdmin ? "sm:grid-cols-2" : "sm:grid-cols-3"
            } sm:divide-x sm:divide-y-0`}
          >
            {isAdmin ? (
              <>
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">Leads Today</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.totals.leadsToday}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      from all callers
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-[#64748B]">Campaigns Progress</p>
                    <span className="text-xs font-semibold tabular-nums text-[#0077B6]">
                      {snapshot.totals.activeCampaigns}{" "}
                      {snapshot.totals.activeCampaigns === 1 ? "campaign" : "campaigns"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.totals.overallDailyProgressPercent}%
                    </span>
                    <span className="text-xs tabular-nums text-[#64748B]">
                      {snapshot.totals.leadsToday} / {snapshot.totals.overallDailyTarget} total target
                    </span>
                  </div>
                  <div className="theme-track mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="theme-progress-fill h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${snapshot.totals.overallDailyProgressPercent}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">My Leads Today</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.personal.leadsToday}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {snapshot.personal.dailyRank === 1 && snapshot.personal.leadsToday > 0
                        ? "Leading today"
                        : gapToFirst > 0
                          ? `${gapToFirst} behind ${leaderToday?.fullName}`
                          : "Ready to score"}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">Daily Rank</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    {snapshot.personal.dailyRank &&
                      snapshot.personal.dailyRank <= 3 &&
                      snapshot.personal.leadsToday > 0 && (
                        <CrownBadge rank={snapshot.personal.dailyRank} />
                      )}
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.personal.dailyRank ? `#${snapshot.personal.dailyRank}` : "—"}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      of {snapshot.personal.totalCallersRankedToday} callers
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-[#64748B]">Team Daily Progress</p>
                    <span className="text-xs font-semibold tabular-nums text-[#0077B6]">
                      {snapshot.totals.overallDailyProgressPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.totals.leadsToday}
                    </span>
                    <span className="text-xs tabular-nums text-[#64748B]">
                      / {snapshot.totals.overallDailyTarget} target across{" "}
                      {snapshot.totals.activeCampaigns} campaigns
                    </span>
                  </div>
                  <div className="theme-track mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="theme-progress-fill h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${snapshot.totals.overallDailyProgressPercent}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Main Workspace: Left (Daily Leaderboard) | Right (Telegram Summary Buttons + Active Campaign Targets) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[7fr_4fr] lg:items-start">
          <div className="min-w-0">
            <LeaderboardPanel
              daily={snapshot.leaderboards.daily}
              monthly={snapshot.leaderboards.monthly}
              allTime={snapshot.leaderboards.allTime}
              currentUserId={user.id}
              dailyOnly
              hideTitle
            />
          </div>

          <div className="space-y-3 min-w-0">
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    type: "campaigns",
                    label: "Campaigns Progress",
                    loadingLabel: "Sending Campaigns...",
                  },
                  {
                    type: "callers",
                    label: "Callers Progress",
                    loadingLabel: "Sending Callers...",
                  },
                ] as const
              ).map((item) => (
                <Button
                  key={item.type}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-[92px] sm:min-h-[104px] w-full flex-col items-center justify-center gap-2.5 rounded-xl border-[#E3E8EE] bg-white px-3 py-4 text-center text-xs sm:text-sm font-semibold text-[#0A2540] shadow-[0_1px_2px_rgba(10,37,64,0.04)] hover:border-[#CBD5E1] hover:bg-[#FAFBFD]"
                  disabled={sendingSummary !== null}
                  onClick={() => handleSendTelegramSummary(item.type)}
                >
                  <Send className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-[#0077B6]" />
                  <span className="leading-tight whitespace-normal">
                    {sendingSummary === item.type ? item.loadingLabel : item.label}
                  </span>
                </Button>
              ))}
            </div>

            <CampaignProgressPanel campaigns={snapshot.campaigns} hideTitle />
          </div>
        </div>
      </div>

      {/* Floating Bottom-Center Announce Button (Callers Only) */}
      {user.role !== "ADMIN" && (
        <>
          <div className="fixed bottom-4 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40">
            <Button
              size="lg"
              className="h-12 w-full sm:w-auto rounded-full bg-primary px-8 text-sm font-semibold tracking-wide text-primary-foreground shadow-lg ring-4 ring-background/90 transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              onClick={() => setAnnounceOpen(true)}
            >
              <Megaphone className="h-4 w-4" />
              ANNOUNCE LEAD
            </Button>
          </div>

          <AnnounceLeadDialog
            open={announceOpen}
            onOpenChange={setAnnounceOpen}
            campaigns={snapshot.campaigns}
            announcementName={user.announcementName}
            announcementTemplate={user.announcementTemplate}
            onSuccess={refreshNow}
          />
        </>
      )}
    </AppShell>
  );
}
