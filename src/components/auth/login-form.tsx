"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { BrandSettingsPublic } from "@/lib/dashboard";

export function LoginForm({
  brand,
  setupWarning = null,
}: {
  brand: BrandSettingsPublic;
  setupWarning?: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error || "Login failed. Please check your credentials.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-canvas relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12 transition-colors duration-200">
      {/* Soft top radial light wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-96 w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--theme-accent-soft)" }}
      />

      <div className="fixed top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      {/* Cardless Centered Flow */}
      <div className="relative z-10 w-full max-w-[360px] space-y-6">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.brandLogoUrl || "/logo.png"}
            alt={brand.brandName}
            className="h-20 sm:h-24 w-auto object-contain"
          />
        </div>

        {/* Gradient hairline divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {setupWarning && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              {setupWarning}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
              Username
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
                className="h-11 rounded-xl border-border/75 bg-card/85 pl-10 pr-3.5 shadow-sm backdrop-blur-sm focus-visible:bg-card"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                className="h-11 rounded-xl border-border/75 bg-card/85 pl-10 pr-10 shadow-sm backdrop-blur-sm focus-visible:bg-card"
              />
            </div>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 pt-0.5 text-xs sm:text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
            />
            <span>Remember me</span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_25px_-6px_var(--theme-accent-soft)] transition-all hover:opacity-95 active:scale-[0.99]"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/75">
          Need an account or password reset? Contact your administrator.
        </p>
      </div>

      {/* Subtle footer metadata */}
      <footer className="pointer-events-none fixed bottom-4 inset-x-0 text-center text-[11px] font-medium text-muted-foreground/60">
        {brand.brandName} · {brand.timezoneLabel}
      </footer>
    </div>
  );
}
