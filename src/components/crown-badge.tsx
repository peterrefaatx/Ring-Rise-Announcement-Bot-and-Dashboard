import React from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrownBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/90 bg-amber-50 text-amber-600 shadow-[0_1px_2px_rgba(217,119,6,0.12)]"
        title="1st Place — Gold Crown"
      >
        <Crown className="h-4 w-4 fill-amber-400 text-amber-600" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
        title="2nd Place — Silver Crown"
      >
        <Crown className="h-4 w-4 fill-slate-300 text-slate-500" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-300/90 bg-orange-50 text-orange-700 shadow-[0_1px_2px_rgba(180,83,9,0.08)]"
        title="3rd Place — Bronze Crown"
      >
        <Crown className="h-4 w-4 fill-orange-300 text-orange-700" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-semibold tabular-nums text-[#425466]"
      )}
    >
      {rank}
    </span>
  );
}
