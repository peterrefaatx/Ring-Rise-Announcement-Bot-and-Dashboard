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
import { ThemeSwitcher } from "./theme-switcher";
import { PageLoader } from "./page-loader";
import { ThemeBackdrop } from "./theme-backdrop";
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
  const [navigating, setNavigating] = useState(false);

  React.useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  function handleNavigate(href: string) {
    const isSameRoute =
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (!isSameRoute) {
      setNavigating(true);
    }
    router.push(href);
  }

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
      className="theme-canvas relative min-h-screen flex flex-col transition-colors duration-200"
      style={{ "--brand-accent": brand.brandPrimaryColor } as React.CSSProperties}
    >
      <ThemeBackdrop />
      {/* Symmetric Split Header */}
      <header className="theme-header sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-200">
        <div className="mx-auto grid h-[72px] sm:h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-6">
          {/* Left: Theme Switcher */}
          <div className="flex items-center justify-start min-w-0">
            <ThemeSwitcher align="start" />
          </div>

          {/* Center: Clean Centered Logo */}
          <Link
            href="/"
            onClick={() => {
              if (pathname !== "/") setNavigating(true);
            }}
            aria-label={brand.brandName}
            title={brand.brandName}
            className="flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.brandLogoUrl || "/logo.png"}
              alt={brand.brandName}
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>

          {/* Right: User Menu */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="max-w-[90px] sm:max-w-[140px] truncate">{user.announcementName}</span>
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
                      onSelect={() => handleNavigate(item.href)}
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

      {navigating && (
        <PageLoader variant="overlay" logoUrl={brand.brandLogoUrl} />
      )}

      <main
        key={pathname}
        className="animate-nav-enter relative z-10 flex-1 px-3 py-4 sm:p-6 pb-24 sm:pb-28 max-w-7xl w-full mx-auto"
      >
        {children}
      </main>
    </div>
  );
}
