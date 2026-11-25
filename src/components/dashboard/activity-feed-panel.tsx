"use client";

import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityFeedItem } from "@/lib/dashboard";
import { formatEstTime, formatRelativeTime } from "@/lib/timezone";

export function ActivityFeedPanel({ items }: { items: ActivityFeedItem[] }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Live Activity Feed
          </CardTitle>
          <span className="text-xs text-muted-foreground">EST (UTC-5)</span>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No announcements recorded yet. Be the first to announce a lead!
          </div>
        ) : (
          <div className="divide-y max-h-[420px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">
                    <span className="font-mono text-xs text-slate-500 mr-2">
                      {formatEstTime(item.createdAt)}
                    </span>
                    <span className="font-semibold text-slate-900">{item.callerName}</span>{" "}
                    announced a lead in{" "}
                    <span className="font-medium text-slate-900">{item.campaignName}</span>.
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatRelativeTime(item.createdAt, now)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
