"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface BrandLogoProps {
  brandName: string;
  brandTagline?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string | null;
  compact?: boolean;
}

export function BrandLogo({
  brandName,
  brandTagline,
  brandPrimaryColor = "#1D4ED8",
  brandLogoUrl,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl}
          alt={brandName}
          className="h-9 w-9 shrink-0 rounded-lg border object-contain bg-white p-0.5"
        />
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundColor: brandPrimaryColor }}
        >
          <TrendingUp className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{brandName}</p>
        {!compact && brandTagline && (
          <p className="truncate text-xs text-muted-foreground">{brandTagline}</p>
        )}
      </div>
    </div>
  );
}
