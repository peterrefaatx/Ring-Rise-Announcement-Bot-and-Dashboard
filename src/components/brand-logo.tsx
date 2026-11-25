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
  brandPrimaryColor = "#0077B6",
  brandLogoUrl,
  compact = false,
}: BrandLogoProps) {
  const effectiveLogo = brandLogoUrl || "/logo.png";

  return (
    <div className="flex items-center gap-3.5 min-w-0">
      {effectiveLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveLogo}
          alt={brandName}
          className="h-8 w-auto shrink-0 object-contain"
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundColor: brandPrimaryColor }}
        >
          <TrendingUp className="h-4 w-4" />
        </div>
      )}
      <div className="hidden sm:block h-5 w-px bg-[#E3E8EE] shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[#0A2540]">
          {brandName}
        </p>
        {!compact && brandTagline && (
          <p className="hidden md:block truncate text-[11px] text-slate-500">
            {brandTagline}
          </p>
        )}
      </div>
    </div>
  );
}
