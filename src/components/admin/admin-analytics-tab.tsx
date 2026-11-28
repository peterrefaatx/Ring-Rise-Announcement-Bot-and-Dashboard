"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LeaderboardList } from "@/components/dashboard/leaderboard-panel";
import { SectionLoader } from "@/components/ui/section-loader";
import type {
  CallerHistoryAnalytics,
  CampaignHistoryAnalytics,
  DailyDetailAnalytics,
  DailySummaryRow,
  MonthlyDetailAnalytics,
  MonthlySummaryRow,
} from "@/lib/analytics";
import type { AdminCallerRow } from "./admin-callers-tab";
import type { AdminCampaignRow } from "./admin-campaigns-tab";
import { formatEstTime } from "@/lib/timezone";
import { fetchAdminCachedJson, getAdminCache } from "@/lib/admin-cache";

type DailyAnalyticsResponse = {
  summaries: DailySummaryRow[];
  detail: DailyDetailAnalytics;
};

type MonthlyAnalyticsResponse = {
  summaries: MonthlySummaryRow[];
  detail: MonthlyDetailAnalytics;
};

export function AdminAnalyticsTab({
  isActive = true,
  refreshSignal = 0,
  defaultDateEst,
  defaultMonthEst,
  selectedCallerId,
  selectedCampaignId,
  onSelectCallerId,
  onSelectCampaignId,
}: {
  isActive?: boolean;
  refreshSignal?: number;
  defaultDateEst: string;
  defaultMonthEst: string;
  selectedCallerId: string;
  selectedCampaignId: string;
  onSelectCallerId: (id: string) => void;
  onSelectCampaignId: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState("daily");
  const [date, setDate] = useState(defaultDateEst);
  const [month, setMonth] = useState(defaultMonthEst);

  const [dailyData, setDailyData] = useState<DailyAnalyticsResponse | null>(
    () => getAdminCache<DailyAnalyticsResponse>(`analytics:daily:${defaultDateEst}`)?.data ?? null
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalyticsResponse | null>(
    () =>
      getAdminCache<MonthlyAnalyticsResponse>(`analytics:monthly:${defaultMonthEst}`)?.data ??
      null
  );
  const [callerOptions, setCallerOptions] = useState<AdminCallerRow[]>(
    () =>
      getAdminCache<{ callers: AdminCallerRow[] }>("callers:includeDeleted")?.data.callers ?? []
  );
  const [campaignOptions, setCampaignOptions] = useState<AdminCampaignRow[]>(
    () => getAdminCache<{ campaigns: AdminCampaignRow[] }>("campaigns:all")?.data.campaigns ?? []
  );
  const [callerDetail, setCallerDetail] = useState<CallerHistoryAnalytics | null>(() =>
    selectedCallerId
      ? getAdminCache<{ detail: CallerHistoryAnalytics }>(
          `analytics:caller:${selectedCallerId}`
        )?.data.detail ?? null
      : null
  );
  const [campaignDetail, setCampaignDetail] = useState<CampaignHistoryAnalytics | null>(() =>
    selectedCampaignId
      ? getAdminCache<{ detail: CampaignHistoryAnalytics }>(
          `analytics:campaign:${selectedCampaignId}`
        )?.data.detail ?? null
      : null
  );

  useEffect(() => {
    if (!isActive) return;
    void (async () => {
      const [cData, campData] = await Promise.all([
        fetchAdminCachedJson<{ callers: AdminCallerRow[] }>(
          "callers:includeDeleted",
          "/api/admin/callers?includeDeleted=true",
          refreshSignal
        ),
        fetchAdminCachedJson<{ campaigns: AdminCampaignRow[] }>(
          "campaigns:all",
          "/api/admin/campaigns",
          refreshSignal
        ),
      ]);
      if (cData) {
        setCallerOptions(cData.callers);
        if (!selectedCallerId && cData.callers[0]) {
          onSelectCallerId(cData.callers[0].id);
        }
      }
      if (campData) {
        setCampaignOptions(campData.campaigns);
        if (!selectedCampaignId && campData.campaigns[0]) {
          onSelectCampaignId(campData.campaigns[0].id);
        }
      }
    })();
  }, [isActive, refreshSignal, onSelectCallerId, onSelectCampaignId, selectedCallerId, selectedCampaignId]);

  const loadDaily = useCallback(
    async (targetDate: string) => {
      const key = `analytics:daily:${targetDate}`;
      const cached = getAdminCache<DailyAnalyticsResponse>(key);
      if (cached) {
        setDailyData(cached.data);
      } else {
        setDailyData(null);
      }
      const data = await fetchAdminCachedJson<DailyAnalyticsResponse>(
        key,
        `/api/admin/analytics?type=daily&date=${encodeURIComponent(targetDate)}`,
        refreshSignal
      );
      if (data) {
        setDailyData(data);
      }
    },
    [refreshSignal]
  );

  const loadMonthly = useCallback(
    async (targetMonth: string) => {
      const key = `analytics:monthly:${targetMonth}`;
      const cached = getAdminCache<MonthlyAnalyticsResponse>(key);
      if (cached) {
        setMonthlyData(cached.data);
      } else {
        setMonthlyData(null);
      }
      const data = await fetchAdminCachedJson<MonthlyAnalyticsResponse>(
        key,
        `/api/admin/analytics?type=monthly&month=${encodeURIComponent(targetMonth)}`,
        refreshSignal
      );
      if (data) {
        setMonthlyData(data);
      }
    },
    [refreshSignal]
  );

  useEffect(() => {
    if (!isActive || subTab !== "daily") return;
    void loadDaily(date);
  }, [isActive, subTab, date, loadDaily]);

  useEffect(() => {
    if (!isActive || subTab !== "monthly") return;
    void loadMonthly(month);
  }, [isActive, subTab, month, loadMonthly]);

  useEffect(() => {
    if (!isActive || subTab !== "caller" || !selectedCallerId) return;
    const key = `analytics:caller:${selectedCallerId}`;
    const cached = getAdminCache<{ detail: CallerHistoryAnalytics }>(key);
    if (cached) {
      setCallerDetail(cached.data.detail);
    } else {
      setCallerDetail(null);
    }
    void (async () => {
      const data = await fetchAdminCachedJson<{ detail: CallerHistoryAnalytics }>(
        key,
        `/api/admin/analytics?type=caller&callerId=${encodeURIComponent(selectedCallerId)}`,
        refreshSignal
      );
      if (data) {
        setCallerDetail(data.detail);
      }
    })();
  }, [isActive, subTab, selectedCallerId, refreshSignal]);

  useEffect(() => {
    if (!isActive || subTab !== "campaign" || !selectedCampaignId) return;
    const key = `analytics:campaign:${selectedCampaignId}`;
    const cached = getAdminCache<{ detail: CampaignHistoryAnalytics }>(key);
    if (cached) {
      setCampaignDetail(cached.data.detail);
    } else {
      setCampaignDetail(null);
    }
    void (async () => {
      const data = await fetchAdminCachedJson<{ detail: CampaignHistoryAnalytics }>(
        key,
        `/api/admin/analytics?type=campaign&campaignId=${encodeURIComponent(selectedCampaignId)}`,
        refreshSignal
      );
      if (data) {
        setCampaignDetail(data.detail);
      }
    })();
  }, [isActive, subTab, selectedCampaignId, refreshSignal]);

  function downloadExport(url: string) {
    window.location.href = url;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Historical Analytics & Exports
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExport("/api/admin/export?type=all-time&format=csv")}
          >
            <Download className="h-3.5 w-3.5" />
            All-Time CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExport("/api/admin/export?type=all-time&format=xlsx")}
          >
            <Download className="h-3.5 w-3.5" />
            All-Time Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="daily">Daily History</TabsTrigger>
            <TabsTrigger value="monthly">Monthly History</TabsTrigger>
            <TabsTrigger value="caller">Caller History</TabsTrigger>
            <TabsTrigger value="campaign">Campaign History</TabsTrigger>
          </TabsList>

          {/* Daily History */}
          <TabsContent value="daily" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full sm:w-44"
                />
                {dailyData && (
                  <Badge variant="secondary">
                    {dailyData.detail.totalLeads} leads total
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadExport(`/api/admin/export?type=daily&date=${date}&format=csv`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Daily CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadExport(`/api/admin/export?type=daily&date=${date}&format=xlsx`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Daily Excel
                </Button>
              </div>
            </div>

            {!dailyData && <SectionLoader label="Loading analytics..." />}
            {dailyData && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Leaderboard for {dailyData.detail.businessDateEst}
                  </h4>
                  <LeaderboardList entries={dailyData.detail.leaderboard} />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Campaign Target Achievement
                  </h4>
                  <div className="rounded-lg border divide-y">
                    {dailyData.detail.campaigns.map((c) => (
                      <div
                        key={c.campaignId}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium">{c.campaignName}</span>
                        <span className="tabular-nums text-slate-700">
                          {c.leadsCount} / {c.dailyTarget} ({c.achievementPercent}%)
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900">
                    Recent Days Overview
                  </h4>
                  <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
                    {dailyData.summaries.map((s) => (
                      <button
                        key={s.businessDateEst}
                        type="button"
                        onClick={() => setDate(s.businessDateEst)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-left"
                      >
                        <span className="font-mono text-slate-800">{s.businessDateEst}</span>
                        <span className="text-slate-600">
                          {s.totalLeads} leads · Top: {s.topCallerName || "—"} ({s.topCallerLeads})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Monthly History */}
          <TabsContent value="monthly" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full sm:w-44"
                />
                {monthlyData && (
                  <Badge variant="secondary">
                    {monthlyData.detail.totalLeads} leads total
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadExport(`/api/admin/export?type=monthly&month=${month}&format=csv`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Monthly CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadExport(`/api/admin/export?type=monthly&month=${month}&format=xlsx`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Monthly Excel
                </Button>
              </div>
            </div>

            {!monthlyData && <SectionLoader label="Loading analytics..." />}
            {monthlyData && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Monthly Rankings ({monthlyData.detail.businessMonthEst})
                  </h4>
                  <LeaderboardList entries={monthlyData.detail.leaderboard} />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Campaign Totals</h4>
                  <div className="rounded-lg border divide-y">
                    {monthlyData.detail.campaigns.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No campaign data for this month.</p>
                    ) : (
                      monthlyData.detail.campaigns.map((c) => (
                        <div
                          key={c.campaignId}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="font-medium">{c.campaignName}</span>
                          <span className="font-semibold tabular-nums">{c.leadsCount}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900">Previous Months</h4>
                  <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
                    {monthlyData.summaries.map((m) => (
                      <button
                        key={m.businessMonthEst}
                        type="button"
                        onClick={() => setMonth(m.businessMonthEst)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-left"
                      >
                        <span className="font-mono">{m.businessMonthEst}</span>
                        <span className="text-slate-600">
                          {m.totalLeads} leads · Winner: {m.winnerName || "—"} ({m.winnerLeads})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Individual Caller History */}
          <TabsContent value="caller" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <select
                className="h-9 w-full sm:w-auto sm:min-w-[240px] rounded-md border border-input bg-background px-3 text-sm"
                value={selectedCallerId}
                onChange={(e) => onSelectCallerId(e.target.value)}
              >
                {callerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.announcementName}) — {c.status}
                  </option>
                ))}
              </select>

              {selectedCallerId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadExport(
                        `/api/admin/export?type=caller&callerId=${selectedCallerId}&format=csv`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Caller CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadExport(
                        `/api/admin/export?type=caller&callerId=${selectedCallerId}&format=xlsx`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Caller Excel
                  </Button>
                </div>
              )}
            </div>

            {selectedCallerId && !callerDetail && <SectionLoader label="Loading analytics..." />}
            {callerDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">Today</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{callerDetail.totals.today}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">This Month</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{callerDetail.totals.thisMonth}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">Lifetime Leads</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{callerDetail.totals.lifetime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Campaign Breakdown</h4>
                    <div className="rounded-lg border divide-y">
                      {callerDetail.campaignBreakdown.map((c) => (
                        <div
                          key={c.campaignId}
                          className="flex justify-between px-4 py-2 text-sm"
                        >
                          <span>{c.campaignName}</span>
                          <span className="font-semibold tabular-nums">{c.leadCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Recent Announcements</h4>
                    <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                      {callerDetail.recentAnnouncements.map((a) => (
                        <div key={a.id} className="px-4 py-2 text-sm flex justify-between gap-2">
                          <span className="truncate">{a.campaignName}</span>
                          <span className="font-mono text-xs text-slate-500 shrink-0">
                            {a.businessDateEst} {formatEstTime(a.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Campaign History */}
          <TabsContent value="campaign" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <select
                className="h-9 w-full sm:w-auto sm:min-w-[240px] rounded-md border border-input bg-background px-3 text-sm"
                value={selectedCampaignId}
                onChange={(e) => onSelectCampaignId(e.target.value)}
              >
                {campaignOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.status}
                  </option>
                ))}
              </select>

              {selectedCampaignId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadExport(
                        `/api/admin/export?type=campaign&campaignId=${selectedCampaignId}&format=csv`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Campaign CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadExport(
                        `/api/admin/export?type=campaign&campaignId=${selectedCampaignId}&format=xlsx`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" />
                    Campaign Excel
                  </Button>
                </div>
              )}
            </div>

            {selectedCampaignId && !campaignDetail && <SectionLoader label="Loading analytics..." />}
            {campaignDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">Today</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{campaignDetail.totals.today}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">This Month</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{campaignDetail.totals.thisMonth}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
                    <p className="text-xs text-slate-500">Lifetime Leads</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold">{campaignDetail.totals.lifetime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Daily Target Achievement</h4>
                    <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                      {campaignDetail.dailyHistory.map((d) => (
                        <div
                          key={d.businessDateEst}
                          className="flex justify-between px-4 py-2 text-sm"
                        >
                          <span className="font-mono">{d.businessDateEst}</span>
                          <span className="tabular-nums">
                            {d.leadCount} / {d.effectiveTarget} ({d.achievementPercent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Top Contributors</h4>
                    <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                      {campaignDetail.topCallers.map((c) => (
                        <div key={c.userId} className="flex justify-between px-4 py-2 text-sm">
                          <span>{c.announcementName}</span>
                          <span className="font-semibold tabular-nums">{c.leadCount} leads</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
