import React from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrownBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-500 shadow-xs"
        title="1st Place — Gold Crown"
      >
        <Crown className="h-4 w-4 fill-amber-400 text-amber-600" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-500 shadow-xs"
        title="2nd Place — Silver Crown"
      >
        <Crown className="h-4 w-4 fill-slate-300 text-slate-500" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-300 bg-orange-50 text-orange-700 shadow-xs"
        title="3rd Place — Bronze Crown"
      >
        <Crown className="h-4 w-4 fill-orange-300 text-orange-700" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground bg-muted"
      )}
    >
      {rank}
    </span>
  );
}
