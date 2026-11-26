"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save, Send, RefreshCw, Bot, Palette, Clock, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatEstTime } from "@/lib/timezone";

interface AdminSettingsResponse {
  settings: {
    brandName: string;
    brandTagline: string;
    brandPrimaryColor: string;
    brandLogoUrl: string;
    timezoneLabel: string;
    telegramEnabled: boolean;
    telegramChatId: string;
    hasTelegramBotToken: boolean;
    telegramBotTokenMasked: string | null;
    telegramConfigSource: "database" | "env" | "unconfigured";
  };
}

interface TelegramQueueResponse {
  counts: Record<string, number>;
  jobs: Array<{
    id: string;
    announcementId: string;
    callerName: string;
    campaignName: string;
    messageText: string;
    status: "SENT" | "PENDING" | "RETRYING" | "PROCESSING" | "FAILED";
    attempts: number;
    maxAttempts: number;
    lastError: string | null;
    telegramMessageId: string | null;
    sentAt: string | null;
    nextRetryAt: string;
    createdAt: string;
  }>;
}

export function AdminSettingsTab({
  refreshSignal,
  onSettingsSaved,
}: {
  refreshSignal: number;
  onSettingsSaved: () => void;
}) {
  const [brandName, setBrandName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [timezoneLabel, setTimezoneLabel] = useState("EST (UTC-5 Fixed)");

  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [newBotToken, setNewBotToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [configSource, setConfigSource] = useState<string>("unconfigured");

  const [queue, setQueue] = useState<TelegramQueueResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resettingLeads, setResettingLeads] = useState(false);

  const loadAll = useCallback(async () => {
    const [sRes, qRes] = await Promise.all([
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/telegram", { cache: "no-store" }),
    ]);
    if (sRes.ok) {
      const data = (await sRes.json()) as AdminSettingsResponse;
      setBrandName(data.settings.brandName);
      setBrandTagline(data.settings.brandTagline);
      setBrandLogoUrl(data.settings.brandLogoUrl);
      setTimezoneLabel(data.settings.timezoneLabel);
      setTelegramEnabled(data.settings.telegramEnabled);
      setTelegramChatId(data.settings.telegramChatId);
      setHasToken(data.settings.hasTelegramBotToken);
      setMaskedToken(data.settings.telegramBotTokenMasked);
      setConfigSource(data.settings.telegramConfigSource);
    }
    if (qRes.ok) {
      setQueue((await qRes.json()) as TelegramQueueResponse);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll, refreshSignal]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          brandTagline,
          brandLogoUrl,
          telegramEnabled,
          telegramChatId,
          ...(newBotToken.trim() ? { telegramBotToken: newBotToken.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (AdminSettingsResponse & { error?: string })
        | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to save settings");
        return;
      }
      setNewBotToken("");
      toast.success("Settings saved");
      await loadAll();
      onSettingsSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Telegram test failed");
        return;
      }
      toast.success("Test message sent to Telegram group!");
    } finally {
      setTestingTelegram(false);
    }
  }

  async function handleRetryJob(jobId: string) {
    setRetryingJobId(jobId);
    try {
      const res = await fetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", jobId }),
      });
      const data = (await res.json().catch(() => null)) as {
        status?: string;
        error?: string;
      } | null;
      if (data?.status === "SENT") {
        toast.success("Telegram notification delivered!");
      } else {
        toast.error(data?.error || `Retry status: ${data?.status || "failed"}`);
      }
      await loadAll();
    } finally {
      setRetryingJobId(null);
    }
  }

  async function handleResetAllLeads(e: React.FormEvent) {
    e.preventDefault();
    if (resetConfirmText.trim() !== "RESET" || resettingLeads) return;
    setResettingLeads(true);
    try {
      const res = await fetch("/api/admin/leads/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        deletedCount?: number;
      } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to reset leads.");
        return;
      }
      toast.success(`All leads reset (${data?.deletedCount ?? 0} removed).`);
      setResetDialogOpen(false);
      setResetConfirmText("");
      await loadAll();
      onSettingsSaved();
    } catch {
      toast.error("Network error while resetting leads.");
    } finally {
      setResettingLeads(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Branding & Timezone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" />
              Branding & System Timezone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Brand / Workspace Name</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL (optional)</Label>
              <Input
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.target.value)}
                placeholder="/logo.png or https://..."
              />
            </div>

            <div className="rounded-lg border bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-800">Business Day Timezone</span>
              </div>
              <Badge variant="outline">{timezoneLabel}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Telegram Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Enable Telegram Announcements</p>
                <p className="text-xs text-slate-500">
                  Source: <span className="font-mono">{configSource}</span>
                </p>
              </div>
              <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label>Telegram Group Chat ID</Label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-1001234567890"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Telegram Bot Token{" "}
                {hasToken && maskedToken && (
                  <span className="text-xs font-normal text-slate-500">
                    (Configured: {maskedToken})
                  </span>
                )}
              </Label>
              <PasswordInput
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
                placeholder={
                  hasToken ? "Leave blank to keep existing token" : "123456789:ABCdef..."
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendTest}
                disabled={testingTelegram}
              >
                <Send className="h-4 w-4" />
                {testingTelegram ? "Sending..." : "Send Test Message"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Telegram Notification Delivery Queue */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Telegram Delivery Status</CardTitle>
          </div>
          {queue && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Sent: {queue.counts.SENT || 0}</Badge>
              <Badge variant="warning">
                Retrying: {(queue.counts.RETRYING || 0) + (queue.counts.PENDING || 0)}
              </Badge>
              <Badge variant="destructive">Failed: {queue.counts.FAILED || 0}</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Mobile Queue Cards */}
          <div className="space-y-2.5 md:hidden">
            {!queue || queue.jobs.length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-slate-500">
                No Telegram notification jobs recorded yet.
              </div>
            ) : (
              queue.jobs.map((job) => (
                <div key={job.id} className="rounded-lg border bg-card p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      {formatEstTime(job.createdAt)} EST
                    </span>
                    <Badge
                      variant={
                        job.status === "SENT"
                          ? "success"
                          : job.status === "FAILED"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-2">{job.messageText}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      Attempts: {job.attempts}/{job.maxAttempts} ·{" "}
                      {job.lastError || (job.telegramMessageId ? `Msg #${job.telegramMessageId}` : "Queued")}
                    </span>
                    {job.status !== "SENT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingJobId === job.id}
                        onClick={() => handleRetryJob(job.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-b">
                <tr>
                  <th className="px-4 py-2.5">Time (EST)</th>
                  <th className="px-4 py-2.5">Message</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Attempts</th>
                  <th className="px-4 py-2.5">Details</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {!queue || queue.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No Telegram notification jobs recorded yet.
                    </td>
                  </tr>
                ) : (
                  queue.jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {formatEstTime(job.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 max-w-sm truncate">{job.messageText}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            job.status === "SENT"
                              ? "success"
                              : job.status === "FAILED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {job.attempts} / {job.maxAttempts}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                        {job.lastError || (job.telegramMessageId ? `Msg #${job.telegramMessageId}` : "Queued")}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {job.status !== "SENT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingJobId === job.id}
                            onClick={() => handleRetryJob(job.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Reset All Leads */}
      <Card className="border-red-500/30">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Data Management
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Permanently clear all lead announcements and reset daily, monthly, and lifetime leaderboards to zero while keeping accounts and campaigns.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto shrink-0"
            onClick={() => {
              setResetConfirmText("");
              setResetDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Reset All Leads
          </Button>
        </CardHeader>
      </Card>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          if (!resettingLeads) {
            setResetDialogOpen(open);
            if (!open) setResetConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Reset All Leads
            </DialogTitle>
            <DialogDescription>
              This action permanently deletes all announced leads across Today, This Month, and Lifetime totals, clears campaign progress counts, and removes Telegram delivery queue history. Caller accounts, campaigns, and settings will not be deleted.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetAllLeads} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-leads-confirm">
                Type <span className="font-mono font-bold">RESET</span> to confirm
              </Label>
              <Input
                id="reset-leads-confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                disabled={resettingLeads}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={resettingLeads}
                onClick={() => {
                  setResetDialogOpen(false);
                  setResetConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={resetConfirmText.trim() !== "RESET" || resettingLeads}
              >
                {resettingLeads ? "Resetting..." : "Confirm Reset All Leads"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
