"use client";

import React, { useMemo, useState } from "react";
import { Save, RotateCcw, MessageSquare, History } from "lucide-react";
import { toast } from "sonner";
import { AppShell, type AppShellUser } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { BrandSettingsPublic } from "@/lib/dashboard";
import type { CallerHistoryAnalytics } from "@/lib/analytics";
import {
  DEFAULT_ANNOUNCEMENT_TEMPLATE,
  MAX_ANNOUNCEMENT_NAME_LENGTH,
  MAX_TEMPLATE_LENGTH,
  renderAnnouncementMessage,
  validateAnnouncementTemplate,
} from "@/lib/template";
import { formatEstTime } from "@/lib/timezone";

interface ProfileClientProps {
  user: AppShellUser & {
    email: string | null;
    announcementTemplate: string;
  };
  brand: BrandSettingsPublic;
  businessDateEst: string;
  history: CallerHistoryAnalytics;
}

export function ProfileClient({
  user,
  brand,
  businessDateEst,
  history,
}: ProfileClientProps) {
  const [announcementName, setAnnouncementName] = useState(user.announcementName);
  const [announcementTemplate, setAnnouncementTemplate] = useState(user.announcementTemplate);
  const [saving, setSaving] = useState(false);

  const templateCheck = useMemo(
    () => validateAnnouncementTemplate(announcementTemplate),
    [announcementTemplate]
  );

  const livePreview = useMemo(() => {
    const previewName = announcementName.trim() || user.announcementName;
    if (!templateCheck.valid) {
      return renderAnnouncementMessage(
        DEFAULT_ANNOUNCEMENT_TEMPLATE,
        previewName,
        "Digital Nomad"
      );
    }
    return renderAnnouncementMessage(announcementTemplate, previewName, "Digital Nomad");
  }, [announcementName, announcementTemplate, templateCheck.valid, user.announcementName]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!announcementName.trim()) {
      toast.error("Announcement display name cannot be empty.");
      return;
    }
    if (!templateCheck.valid) {
      toast.error(templateCheck.error || "Invalid announcement template.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementName: announcementName.trim(),
          announcementTemplate,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to update profile settings.");
        return;
      }
      toast.success("Announcement profile saved.");
    } catch {
      toast.error("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <AppShell user={user} brand={brand} businessDateEst={businessDateEst}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {isAdmin ? "Profile" : "Profile & Personal Performance"}
          </h1>
        </div>

        {/* Account Summary + Telegram Customization */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className={isAdmin ? "lg:col-span-6" : "lg:col-span-5"}>
            <CardHeader>
              <CardTitle className="text-base">Account Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-slate-500">Account Name</span>
                <span className="font-medium text-slate-900">{user.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-slate-500">Login Username</span>
                <span className="font-mono text-slate-900">@{user.username}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900">{user.email || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Role</span>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            </CardContent>
          </Card>

          {!isAdmin && (
            <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Telegram Announcement Customization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="announcementName">Announcement Display Name</Label>
                  <Input
                    id="announcementName"
                    value={announcementName}
                    maxLength={MAX_ANNOUNCEMENT_NAME_LENGTH}
                    onChange={(e) => setAnnouncementName(e.target.value)}
                    placeholder="e.g. Ahmed"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Shown in Telegram announcements and team leaderboards.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="announcementTemplate">Custom Announcement Message</Label>
                    <span className="text-xs text-slate-400">
                      {announcementTemplate.length} / {MAX_TEMPLATE_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="announcementTemplate"
                    value={announcementTemplate}
                    maxLength={MAX_TEMPLATE_LENGTH}
                    onChange={(e) => setAnnouncementTemplate(e.target.value)}
                    placeholder={DEFAULT_ANNOUNCEMENT_TEMPLATE}
                    required
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Required placeholders:</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                      {"{name}"}
                    </code>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                      {"{campaign}"}
                    </code>
                  </div>
                  {!templateCheck.valid && (
                    <p className="text-xs font-medium text-red-600">{templateCheck.error}</p>
                  )}
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Live Telegram Preview (sample campaign: Digital Nomad)
                  </p>
                  <p className="text-sm font-medium text-slate-900">{livePreview}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={saving || !templateCheck.valid || !announcementName.trim()}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAnnouncementTemplate(DEFAULT_ANNOUNCEMENT_TEMPLATE)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Template
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Personal Historical Performance (Callers Only) */}
        {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Personal Performance History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Today (EST)</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{history.totals.today}</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs text-slate-500">This Month (EST)</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{history.totals.thisMonth}</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Lifetime Total</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{history.totals.lifetime}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Campaign Breakdown</h4>
                {history.campaignBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">No leads announced yet.</p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {history.campaignBreakdown.map((c) => (
                      <div
                        key={c.campaignId}
                        className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                      >
                        <span className="font-medium text-slate-800">{c.campaignName}</span>
                        <span className="font-semibold tabular-nums">{c.leadCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Recent Daily Totals</h4>
                {history.dailyHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No daily history recorded yet.</p>
                ) : (
                  <div className="divide-y rounded-lg border max-h-56 overflow-y-auto">
                    {history.dailyHistory.map((d) => (
                      <div
                        key={d.businessDateEst}
                        className="flex items-center justify-between px-3.5 py-2 text-sm"
                      >
                        <span className="font-mono text-slate-700">{d.businessDateEst}</span>
                        <span className="font-semibold tabular-nums">{d.leadCount} leads</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Recent Announcements</h4>
              {history.recentAnnouncements.length === 0 ? (
                <p className="text-sm text-slate-500">No announcements yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {history.recentAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3.5 py-2.5 text-sm"
                    >
                      <span className="text-slate-800">{item.renderedMessage}</span>
                      <span className="shrink-0 font-mono text-xs text-slate-500">
                        {item.businessDateEst} {formatEstTime(item.createdAt)} EST
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </AppShell>
  );
}
