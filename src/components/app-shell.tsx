"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCog,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { ThemeSwitcher } from "./theme-switcher";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BrandSettingsPublic } from "@/lib/dashboard";

export interface AppShellUser {
  id: string;
  fullName: string;
  username: string;
  role: "ADMIN" | "CALLER";
  announcementName: string;
}

export type ConnectionState = "live" | "reconnecting" | "offline";

interface AppShellProps {
  user: AppShellUser;
  brand: BrandSettingsPublic;
  businessDateEst?: string;
  connectionState?: ConnectionState;
  onManualRefresh?: () => void;
  children: React.ReactNode;
}

export function AppShell({ user, brand, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (user.announcementName || user.fullName || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/profile",
      label: user.role === "ADMIN" ? "Profile" : "Profile & History",
      icon: UserCog,
    },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }]
      : []),
  ];

  React.useEffect(() => {
    router.prefetch("/");
    router.prefetch("/profile");
    if (user.role === "ADMIN") {
      router.prefetch("/admin");
    }
  }, [router, user.role]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div
      className="theme-canvas min-h-screen flex flex-col transition-colors duration-200"
      style={{ "--brand-accent": brand.brandPrimaryColor } as React.CSSProperties}
    >
      {/* Top Bar */}
      <header className="theme-header sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 sm:h-[72px] max-w-7xl items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6">
          <Link href="/" className="min-w-0 flex-1 sm:flex-initial hover:opacity-90 transition-opacity">
            <BrandLogo
              brandName={brand.brandName}
              brandPrimaryColor={brand.brandPrimaryColor}
              brandLogoUrl={brand.brandLogoUrl}
              compact
            />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeSwitcher />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 sm:py-1.5 sm:pl-1.5 sm:pr-3 text-xs sm:text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] sm:text-xs font-semibold text-primary">
                    {initials}
                  </span>
                  <span className="max-w-[80px] sm:max-w-[130px] truncate">{user.announcementName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg">
                <div className="rounded-md bg-muted/70 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.fullName}
                    </p>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    @{user.username}
                    {user.role !== "ADMIN" ? ` · Display: ${user.announcementName}` : ""}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onSelect={() => router.push(item.href)}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm text-muted-foreground",
                        active && "bg-primary/15 font-semibold text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  disabled={loggingOut}
                  className="rounded-md px-3 py-2 text-sm text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 sm:p-6 pb-24 sm:pb-28 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
