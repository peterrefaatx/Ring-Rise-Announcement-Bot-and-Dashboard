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
  Menu,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
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
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col"
      style={{ "--brand-accent": brand.brandPrimaryColor } as React.CSSProperties}
    >
      {/* Top Header with Navigation Dropdown */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="min-w-0 hover:opacity-90 transition-opacity">
            <BrandLogo
              brandName={brand.brandName}
              brandTagline={brand.brandTagline}
              brandPrimaryColor={brand.brandPrimaryColor}
              brandLogoUrl={brand.brandLogoUrl}
            />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Menu className="h-4 w-4 text-slate-500" />
                <span className="max-w-[140px] truncate font-medium">
                  {user.announcementName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.fullName}
                  </p>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  @{user.username} · Display: {user.announcementName}
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
                      active && "bg-slate-100 font-semibold text-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                disabled={loggingOut}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 pb-28 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
