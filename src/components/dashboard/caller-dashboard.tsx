"use client";

import React, { useState } from "react";
import { Megaphone, Send, BarChart2, Users } from "lucide-react";
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
        <section className="rounded-xl border border-[#E3E8EE] bg-white shadow-[0_1px_2px_rgba(10,37,64,0.04),0_4px_12px_rgba(10,37,64,0.03)]">
          <div className="grid grid-cols-1 divide-y divide-[#E3E8EE] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {isAdmin ? (
              <>
                <div className="p-5">
                  <p className="text-xs font-medium text-[#64748B]">Leads Today</p>
                  <div className="mt-1.5 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.totals.leadsToday}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      from all callers
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#64748B]">Campaigns Progress</p>
                    <span className="text-xs font-semibold tabular-nums text-[#0077B6]">
                      {snapshot.totals.activeCampaigns}{" "}
                      {snapshot.totals.activeCampaigns === 1 ? "campaign" : "campaigns"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.totals.overallDailyProgressPercent}%
                    </span>
                    <span className="text-xs tabular-nums text-[#64748B]">
                      {snapshot.totals.leadsToday} / {snapshot.totals.overallDailyTarget} total target
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF2F6]">
                    <div
                      className="h-full rounded-full bg-[#0077B6] transition-all duration-300 ease-out"
                      style={{ width: `${snapshot.totals.overallDailyProgressPercent}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-5">
                  <p className="text-xs font-medium text-[#64748B]">My Leads Today</p>
                  <div className="mt-1.5 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
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

                <div className="p-5">
                  <p className="text-xs font-medium text-[#64748B]">Daily Rank</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    {snapshot.personal.dailyRank &&
                      snapshot.personal.dailyRank <= 3 &&
                      snapshot.personal.leadsToday > 0 && (
                        <CrownBadge rank={snapshot.personal.dailyRank} />
                      )}
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                      {snapshot.personal.dailyRank ? `#${snapshot.personal.dailyRank}` : "—"}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      of {snapshot.personal.totalCallersRankedToday} callers
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#64748B]">Team Daily Progress</p>
                <span className="text-xs font-semibold tabular-nums text-[#0077B6]">
                  {snapshot.totals.overallDailyProgressPercent}%
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-[#0A2540]">
                  {snapshot.totals.leadsToday}
                </span>
                <span className="text-xs tabular-nums text-[#64748B]">
                  / {snapshot.totals.overallDailyTarget} target across{" "}
                  {snapshot.totals.activeCampaigns} campaigns
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF2F6]">
                <div
                  className="h-full rounded-full bg-[#0077B6] transition-all duration-300 ease-out"
                  style={{ width: `${snapshot.totals.overallDailyProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main Workspace: 60% Left (Daily Leaderboard) | 30% Right (Telegram Summary Buttons + Active Campaign Targets) */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:w-[60%]">
            <LeaderboardPanel
              daily={snapshot.leaderboards.daily}
              monthly={snapshot.leaderboards.monthly}
              allTime={snapshot.leaderboards.allTime}
              currentUserId={user.id}
              businessDateEst={snapshot.businessDateEst}
              businessMonthEst={snapshot.businessMonthEst}
              dailyOnly
              hideTitle
            />
          </div>

          <div className="w-full space-y-3 lg:w-[30%]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-[#E3E8EE] bg-white px-4 py-2.5 h-auto text-xs font-semibold text-[#0A2540] shadow-[0_1px_2px_rgba(10,37,64,0.04)] hover:border-[#CBD5E1] hover:bg-[#FAFBFD]"
                disabled={sendingSummary !== null}
                onClick={() => handleSendTelegramSummary("campaigns")}
              >
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#0077B6]" />
                  {sendingSummary === "campaigns"
                    ? "Sending Campaigns Progress..."
                    : "Send Campaigns Progress"}
                </span>
                <Send className="h-3.5 w-3.5 text-[#64748B]" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-[#E3E8EE] bg-white px-4 py-2.5 h-auto text-xs font-semibold text-[#0A2540] shadow-[0_1px_2px_rgba(10,37,64,0.04)] hover:border-[#CBD5E1] hover:bg-[#FAFBFD]"
                disabled={sendingSummary !== null}
                onClick={() => handleSendTelegramSummary("callers")}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0077B6]" />
                  {sendingSummary === "callers"
                    ? "Sending Callers Progress..."
                    : "Send Callers Progress"}
                </span>
                <Send className="h-3.5 w-3.5 text-[#64748B]" />
              </Button>
            </div>

            <CampaignProgressPanel campaigns={snapshot.campaigns} hideTitle />
          </div>
        </div>
      </div>

      {/* Floating Bottom-Center Announce Button (Callers Only) */}
      {user.role !== "ADMIN" && (
        <>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <Button
              size="lg"
              className="h-12 rounded-full bg-[#0077B6] px-8 text-sm font-semibold tracking-wide text-white shadow-[0_12px_28px_-6px_rgba(0,119,182,0.5)] ring-4 ring-white/90 transition-all duration-150 hover:bg-[#005A8D] hover:shadow-[0_16px_32px_-6px_rgba(0,119,182,0.55)] active:scale-[0.98]"
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
