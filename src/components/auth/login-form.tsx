"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
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
    <div className="theme-canvas relative min-h-screen flex items-center justify-center p-4 transition-colors duration-200">
      <div className="fixed top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>
      <div className="w-full max-w-md space-y-7">
        <div className="flex justify-center">
          <BrandLogo
            brandName={brand.brandName}
            brandPrimaryColor={brand.brandPrimaryColor}
            brandLogoUrl={brand.brandLogoUrl}
            compact
          />
        </div>

        <Card className="border-[#E3E8EE] shadow-[0_8px_30px_rgba(10,37,64,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#0A2540]">
              <Lock className="h-4 w-4 text-[#0077B6]" />
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {setupWarning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                  {setupWarning}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-[#425466]">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-10 border-[#D5DCE4] focus-visible:ring-[#0077B6]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-[#425466]">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-10 border-[#D5DCE4] focus-visible:ring-[#0077B6]"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#425466] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-[#D5DCE4] text-[#0077B6] accent-[#0077B6] focus:ring-[#0077B6]"
                />
                <span>Remember me</span>
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-10 w-full rounded-lg bg-primary font-semibold text-primary-foreground hover:opacity-90"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Continue"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
