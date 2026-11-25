"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
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
        body: JSON.stringify({ username, password }),
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
    <div
      className="min-h-screen flex items-center justify-center bg-[#F6F9FC] p-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(0, 119, 182, 0.08), transparent)",
      }}
    >
      <div className="w-full max-w-md space-y-7">
        <div className="flex justify-center">
          <BrandLogo
            brandName={brand.brandName}
            brandTagline={brand.brandTagline}
            brandPrimaryColor={brand.brandPrimaryColor}
            brandLogoUrl={brand.brandLogoUrl}
          />
        </div>

        <Card className="border-[#E3E8EE] shadow-[0_8px_30px_rgba(10,37,64,0.06)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#0A2540]">
              <Lock className="h-4 w-4 text-[#0077B6]" />
              Sign in to your account
            </CardTitle>
            <CardDescription>
              Enter your team credentials to view live rankings and announce leads.
            </CardDescription>
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
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-10 border-[#D5DCE4] focus-visible:ring-[#0077B6]"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-10 w-full rounded-lg bg-[#0077B6] font-semibold text-white hover:bg-[#005A8D]"
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
