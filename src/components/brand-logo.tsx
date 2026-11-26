"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import type { ConnectionState } from "./app-shell";

interface BrandLogoProps {
  brandName: string;
  brandTagline?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string | null;
  compact?: boolean;
  size?: "header" | "lg";
  connectionState?: ConnectionState;
  businessDateEst?: string;
}

export function BrandLogo({
  brandName,
  brandTagline,
  brandPrimaryColor = "#0077B6",
  brandLogoUrl,
  compact = false,
  size = "header",
  connectionState,
  businessDateEst,
}: BrandLogoProps) {
  const effectiveLogo = brandLogoUrl || "/logo.png";
  const isLarge = size === "lg";

  const statusConfig =
    connectionState === "live"
      ? {
          label: "Live",
          dotClass: "bg-emerald-500",
          ping: true,
          textClass: "text-emerald-600 dark:text-emerald-400",
        }
      : connectionState === "reconnecting"
        ? {
            label: "Syncing",
            dotClass: "bg-amber-500",
            ping: false,
            textClass: "text-amber-600 dark:text-amber-400",
          }
        : connectionState === "offline"
          ? {
              label: "Offline",
              dotClass: "bg-red-500",
              ping: false,
              textClass: "text-red-600 dark:text-red-400",
            }
          : null;

  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
      {effectiveLogo ? (
        <div
          className={
            isLarge
              ? "shrink-0 rounded-2xl border border-primary/30 bg-white/95 px-3 py-2 shadow-[0_0_24px_var(--theme-accent-soft)] transition-all duration-200"
              : "shrink-0 rounded-xl border border-primary/25 bg-white/95 px-2 py-1 shadow-[0_0_16px_var(--theme-accent-soft)] transition-all duration-200 group-hover:border-primary/45"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveLogo}
            alt={brandName}
            className={
              isLarge
                ? "h-12 sm:h-14 w-auto object-contain"
                : "h-8 sm:h-9 w-auto object-contain"
            }
          />
        </div>
      ) : (
        <div
          className={
            isLarge
              ? "flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_0_24px_var(--theme-accent-soft)]"
              : "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_0_16px_var(--theme-accent-soft)]"
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
            : "hidden sm:block h-7 w-px bg-border shrink-0"
        }
      />
      <div className="min-w-0">
        <p
          className={
            isLarge
              ? "truncate text-lg sm:text-xl font-bold tracking-[-0.015em] text-foreground"
              : "truncate text-sm sm:text-base font-semibold leading-tight tracking-[-0.01em] text-foreground"
          }
        >
          {brandName}
        </p>
        {!isLarge && (statusConfig || businessDateEst) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none">
            {statusConfig && (
              <span className={`inline-flex items-center gap-1 font-medium ${statusConfig.textClass}`}>
                <span className="relative flex h-1.5 w-1.5">
                  {statusConfig.ping && (
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusConfig.dotClass}`}
                    />
                  )}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                </span>
                <span>{statusConfig.label}</span>
              </span>
            )}
            {statusConfig && businessDateEst && (
              <span className="hidden sm:inline text-muted-foreground/60">·</span>
            )}
            {businessDateEst && (
              <span className="hidden sm:inline font-mono text-muted-foreground">
                {businessDateEst} EST
              </span>
            )}
          </div>
        )}
        {!compact && brandTagline && !statusConfig && (
          <p className="hidden md:block truncate text-[11px] text-muted-foreground">
            {brandTagline}
          </p>
        )}
      </div>
    </div>
  );
}
