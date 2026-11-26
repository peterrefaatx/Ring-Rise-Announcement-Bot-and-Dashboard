import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionLoaderProps {
  label?: string;
  className?: string;
}

export function SectionLoader({
  label = "Loading...",
  className,
}: SectionLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 py-10 text-slate-500",
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </div>
  );
}
