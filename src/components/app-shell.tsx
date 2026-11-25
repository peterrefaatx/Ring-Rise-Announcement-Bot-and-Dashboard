"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCog,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
  businessDateEst: string;
  connectionState?: ConnectionState;
  onManualRefresh?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  user,
  brand,
  businessDateEst,
  connectionState = "live",
  onManualRefresh,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile & History", icon: UserCog },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }]
      : []),
  ];

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
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row"
      style={{ "--brand-accent": brand.brandPrimaryColor } as React.CSSProperties}
    >
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 lg:hidden">
        <BrandLogo
          brandName={brand.brandName}
          brandPrimaryColor={brand.brandPrimaryColor}
          brandLogoUrl={brand.brandLogoUrl}
          compact
        />
        <div className="flex items-center gap-2">
          <ConnectionIndicator state={connectionState} compact />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b px-5 py-4">
          <BrandLogo
            brandName={brand.brandName}
            brandTagline={brand.brandTagline}
            brandPrimaryColor={brand.brandPrimaryColor}
            brandLogoUrl={brand.brandLogoUrl}
          />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 space-y-3">
          <div className="rounded-md bg-slate-50 border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                {user.role}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              @{user.username} · Display: {user.announcementName}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-14 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Business Day: <span className="font-mono text-slate-900">{businessDateEst}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>{brand.timezoneLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator state={connectionState} />
            {onManualRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onManualRefresh}
                title="Sync latest server state"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function ConnectionIndicator({
  state,
  compact = false,
}: {
  state: ConnectionState;
  compact?: boolean;
}) {
  if (state === "live") {
    return (
      <Badge variant="success" className="font-normal">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {!compact && <Wifi className="h-3 w-3" />}
        Live
      </Badge>
    );
  }
  if (state === "reconnecting") {
    return (
      <Badge variant="warning" className="font-normal">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {compact ? "Syncing" : "Reconnecting..."}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      <WifiOff className="h-3 w-3" />
      Offline
    </Badge>
  );
}
