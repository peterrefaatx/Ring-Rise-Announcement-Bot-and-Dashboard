"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save, Send, RefreshCw, Bot, Palette, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
            <CardDescription>
              Configure company identity and logo URL.
            </CardDescription>
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

            <div className="rounded-lg border bg-slate-50 p-3.5 flex items-center justify-between">
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
            <CardDescription>
              Bot tokens are encrypted server-side and never exposed to client code.
            </CardDescription>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Telegram Delivery Status</CardTitle>
            <CardDescription>
              Failed deliveries retry automatically in the background without ever losing lead records.
            </CardDescription>
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
          <div className="overflow-x-auto rounded-lg border">
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
    </div>
  );
}
