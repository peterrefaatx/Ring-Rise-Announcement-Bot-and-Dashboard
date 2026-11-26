import React from "react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  variant?: "fullscreen" | "overlay";
  logoUrl?: string | null;
  className?: string;
}

export function PageLoader({
  variant = "fullscreen",
  logoUrl = "/logo.png",
  className,
}: PageLoaderProps) {
  const content = (
    <div className="relative flex flex-col items-center justify-center gap-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 h-28 w-44 rounded-full opacity-55 blur-2xl"
        style={{ background: "var(--theme-accent-soft)" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || "/logo.png"}
        alt="Loading"
        className="h-16 sm:h-20 w-auto object-contain animate-loader-breathe select-none"
      />
      <div className="theme-track relative h-1.5 w-36 overflow-hidden rounded-full">
        <div className="theme-progress-fill animate-loader-slide h-full w-1/2 rounded-full" />
      </div>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div
        role="status"
        aria-label="Navigating"
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/75 backdrop-blur-md animate-nav-enter",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading page"
      className={cn(
        "theme-canvas flex min-h-screen items-center justify-center p-6 transition-colors duration-200",
        className
      )}
    >
      {content}
    </div>
  );
}
