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
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[#E3E8EE] bg-[#FAFBFD] py-3.5 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0A2540]">
          <Activity className="h-4 w-4 text-[#0077B6]" />
          Recent Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#64748B]">
            No announcements recorded yet. Be the first to announce a lead.
          </div>
        ) : (
          <div className="divide-y divide-[#E3E8EE] max-h-[340px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 px-4 sm:px-5 py-3 text-sm transition-colors hover:bg-[#FAFBFD]"
              >
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="mt-1.5 sm:mt-0 h-2 w-2 shrink-0 rounded-full bg-[#0077B6]" />
                  <p className="text-xs sm:text-sm leading-snug text-[#425466] break-words sm:truncate">
                    <span className="font-mono text-xs text-[#64748B] mr-2 tabular-nums">
                      {formatEstTime(item.createdAt)}
                    </span>
                    <span className="font-semibold text-[#0A2540]">{item.callerName}</span>{" "}
                    announced a lead in{" "}
                    <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#0A2540]">
                      {item.campaignName}
                    </span>
                  </p>
                </div>
                <span className="pl-4.5 sm:pl-0 shrink-0 text-[11px] sm:text-xs tabular-nums text-[#64748B]">
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
