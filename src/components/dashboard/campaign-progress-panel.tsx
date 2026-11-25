"use client";

import React from "react";
import { Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CampaignProgressItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function CampaignProgressPanel({
  campaigns,
}: {
  campaigns: CampaignProgressItem[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Active Campaign Targets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No active campaigns right now.
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-lg border bg-slate-50/50 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold uppercase tracking-wide text-slate-900">
                      {campaign.name}
                    </h4>
                    {campaign.description && (
                      <p className="truncate text-xs text-slate-500">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  {campaign.targetReached ? (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Target Reached
                    </Badge>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 shrink-0">
                      {campaign.progressPercent}% Completed
                    </span>
                  )}
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      campaign.targetReached ? "bg-emerald-600" : "bg-primary"
                    )}
                    style={{ width: `${campaign.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tabular-nums text-slate-800">
                    {campaign.leadsToday} / {campaign.dailyTarget} LEADS
                  </span>
                  <span className="text-slate-500">
                    {campaign.targetReached
                      ? `+${campaign.leadsToday - campaign.dailyTarget} above daily target`
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
