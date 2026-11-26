import React from "react";
import { Crown } from "lucide-react";

export function CrownBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex w-7 items-center justify-center shrink-0"
        title="1st Place — Gold Crown"
      >
        <Crown className="h-5 w-5 fill-amber-400 text-amber-600" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex w-7 items-center justify-center shrink-0"
        title="2nd Place — Silver Crown"
      >
        <Crown className="h-5 w-5 fill-slate-300 text-slate-500" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex w-7 items-center justify-center shrink-0"
        title="3rd Place — Bronze Crown"
      >
        <Crown className="h-5 w-5 fill-orange-300 text-orange-700" />
      </span>
    );
  }

  return (
    <span className="inline-flex w-7 items-center justify-center shrink-0 text-xs font-semibold tabular-nums text-[#425466]">
      {rank}
    </span>
  );
}
