"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface BrandLogoProps {
  brandName: string;
  brandTagline?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string | null;
  compact?: boolean;
  size?: "header" | "lg";
}

export function BrandLogo({
  brandName,
  brandTagline,
  brandPrimaryColor = "#0077B6",
  brandLogoUrl,
  compact = false,
  size = "header",
}: BrandLogoProps) {
  const effectiveLogo = brandLogoUrl || "/logo.png";
  const isLarge = size === "lg";

  return (
    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
      {effectiveLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveLogo}
          alt={brandName}
          className={
            isLarge
              ? "h-14 sm:h-16 w-auto shrink-0 object-contain"
              : "h-10 sm:h-11 w-auto shrink-0 object-contain"
          }
        />
      ) : (
        <div
          className={
            isLarge
              ? "flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              : "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          }
          style={{ backgroundColor: brandPrimaryColor }}
        >
          <TrendingUp className={isLarge ? "h-7 w-7" : "h-5 w-5"} />
        </div>
      )}
      <div
        className={
          isLarge
            ? "hidden sm:block h-8 w-px bg-border shrink-0"
            : "hidden sm:block h-6 w-px bg-border shrink-0"
        }
      />
      <div className="min-w-0">
        <p
          className={
            isLarge
              ? "truncate text-lg sm:text-xl font-bold tracking-[-0.015em] text-foreground"
              : "truncate text-sm sm:text-base font-semibold tracking-[-0.01em] text-foreground"
          }
        >
          {brandName}
        </p>
        {!compact && brandTagline && (
          <p className="hidden md:block truncate text-[11px] text-muted-foreground">
            {brandTagline}
          </p>
        )}
      </div>
    </div>
  );
}
