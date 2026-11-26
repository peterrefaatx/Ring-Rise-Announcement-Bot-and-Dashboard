"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignProgressItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function CampaignProgressPanel({
  campaigns,
  hideTitle = false,
}: {
  campaigns: CampaignProgressItem[];
  hideTitle?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      {!hideTitle && (
        <CardHeader className="border-b border-[#E3E8EE] bg-[#FAFBFD] pb-3.5">
          <CardTitle className="text-base">
            Active Campaign Targets
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">
            No active campaigns right now.
          </div>
        ) : (
          <div className="divide-y divide-[#E3E8EE]">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 sm:p-5 space-y-2.5 sm:space-y-3 transition-colors hover:bg-[#FAFBFD]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold tracking-[-0.01em] text-[#0A2540]">
                      {campaign.name}
                    </h4>
                    {campaign.description && (
                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  {campaign.targetReached ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      100%
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#0077B6]/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#0077B6]">
                      {campaign.progressPercent}%
                    </span>
                  )}
                </div>

                <div className="theme-track h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300 ease-out",
                      campaign.targetReached ? "bg-emerald-500" : "theme-progress-fill"
                    )}
                    style={{ width: `${campaign.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tabular-nums text-[#0A2540]">
                    {campaign.leadsToday} / {campaign.dailyTarget}{" "}
                    <span className="font-normal text-[#64748B]">leads</span>
                  </span>
                  <span className="text-[#64748B] tabular-nums">
                    {campaign.targetReached
                      ? `+${campaign.leadsToday - campaign.dailyTarget} over target`
                      : `${campaign.dailyTarget - campaign.leadsToday} remaining`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
