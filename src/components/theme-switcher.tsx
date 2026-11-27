"use client";

import React from "react";
import {
  Check,
  FlaskConical,
  Flower2,
  Gamepad2,
  Laugh,
  Moon,
  Music2,
  Palette,
  Sun,
} from "lucide-react";
import { APP_THEMES, type ThemeId } from "@/lib/themes";
import { useTheme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

function ThemeCategoryIcon({ id, className }: { id: ThemeId; className?: string }) {
  switch (id) {
    case "dark":
      return <Moon className={className} />;
    case "music":
      return <Music2 className={className} />;
    case "gaming":
      return <Gamepad2 className={className} />;
    case "blush":
      return <Flower2 className={className} />;
    case "meme":
      return <Laugh className={className} />;
    case "breaking-bad":
      return <FlaskConical className={className} />;
    case "classic":
    default:
      return <Sun className={className} />;
  }
}

export function ThemeSwitcher({
  fullWidth = false,
  align = "end",
}: {
  fullWidth?: boolean;
  align?: "start" | "center" | "end";
} = {}) {
  const { themeId, theme, mounted, setThemeId } = useTheme();

  const labelText = mounted ? theme.name : "Theme";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch visual theme"
          className={cn(
            "inline-flex items-center gap-2 border border-border bg-card text-xs font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            fullWidth
              ? "w-full justify-between rounded-lg px-3 py-2"
              : "rounded-full px-3 py-1.5"
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Palette className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span
              className={cn(
                "truncate",
                fullWidth ? "inline" : "hidden sm:inline max-w-[110px]"
              )}
            >
              {labelText}
            </span>
          </span>
          {mounted && (
            <span className="flex items-center gap-0.5 shrink-0">
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: theme.swatches.primary }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 -ml-1"
                style={{ backgroundColor: theme.swatches.secondary }}
              />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-72 max-h-[75vh] overflow-y-auto p-2 shadow-xl">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-foreground">Appearance Themes</p>
          <p className="text-[11px] text-muted-foreground">
            Choose a dark or custom studio palette
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="space-y-1">
          {APP_THEMES.map((item) => {
            const active = item.id === themeId;
            return (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => setThemeId(item.id)}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2",
                  active && "bg-primary/10 text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="flex shrink-0 items-center justify-center"
                    style={{ color: item.swatches.primary }}
                  >
                    <ThemeCategoryIcon id={item.id} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {item.name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex items-center">
                    <span
                      className="h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: item.swatches.primary }}
                    />
                    <span
                      className="h-3 w-3 rounded-full border border-white/20 -ml-1"
                      style={{ backgroundColor: item.swatches.secondary }}
                    />
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
