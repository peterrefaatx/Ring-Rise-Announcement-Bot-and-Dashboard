"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Archive, RotateCcw, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminCampaignRow {
  id: string;
  name: string;
  description: string | null;
  dailyTarget: number;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: string;
  leadsToday: number;
  leadsThisMonth: number;
  leadsAllTime: number;
  progressPercent: number;
}

export function AdminCampaignsTab({
  refreshSignal,
  onInspectCampaign,
}: {
  refreshSignal: number;
  onInspectCampaign: (campaignId: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCampaignRow | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    dailyTarget: 50,
    status: "ACTIVE" as "ACTIVE" | "PAUSED" | "ARCHIVED",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { campaigns: AdminCampaignRow[] };
      setCampaigns(data.campaigns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns, refreshSignal]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          dailyTarget: Number(formState.dailyTarget),
          status: formState.status === "PAUSED" ? "PAUSED" : "ACTIVE",
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to create campaign");
        return;
      }
      toast.success("Campaign created");
      setCreateOpen(false);
      await loadCampaigns();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          dailyTarget: Number(formState.dailyTarget),
          status: formState.status,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to update campaign");
        return;
      }
      toast.success("Campaign updated");
      setEditTarget(null);
      await loadCampaigns();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(
    campaign: AdminCampaignRow,
    status: "ACTIVE" | "PAUSED" | "ARCHIVED"
  ) {
    const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update campaign status");
      return;
    }
    toast.success(`Campaign "${campaign.name}" set to ${status}`);
    await loadCampaigns();
  }

  async function handleDelete(campaign: AdminCampaignRow) {
    const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      toast.error(data?.error || "Cannot delete campaign");
      return;
    }
    toast.success(`Campaign "${campaign.name}" deleted`);
    await loadCampaigns();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Campaign Management</CardTitle>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setFormState({ name: "", description: "", dailyTarget: 50, status: "ACTIVE" });
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </CardHeader>
      <CardContent>
        {/* Mobile Campaign Cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-lg border p-6 text-center text-sm text-slate-500">
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-sm text-slate-500">
              No campaigns created yet.
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onInspectCampaign(c.id)}
                      className="font-semibold text-slate-900 hover:underline text-left truncate block max-w-full"
                    >
                      {c.name}
                    </button>
                    {c.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      c.status === "ACTIVE"
                        ? "success"
                        : c.status === "PAUSED"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2.5 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Today</p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {c.leadsToday}/{c.dailyTarget}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Month</p>
                    <p className="font-semibold tabular-nums text-slate-900">{c.leadsThisMonth}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Lifetime</p>
                    <p className="font-semibold tabular-nums text-slate-900">{c.leadsAllTime}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormState({
                        name: c.name,
                        description: c.description || "",
                        dailyTarget: c.dailyTarget,
                        status: c.status,
                      });
                      setEditTarget(c);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {c.status === "ACTIVE" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      title="Pause campaign"
                      onClick={() => handleStatusChange(c, "PAUSED")}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      title={c.status === "ARCHIVED" ? "Reactivate campaign" : "Activate campaign"}
                      onClick={() => handleStatusChange(c, "ACTIVE")}
                    >
                      {c.status === "ARCHIVED" ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {c.status !== "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="icon"
                      title="Archive campaign"
                      onClick={() => handleStatusChange(c, "ARCHIVED")}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    title={
                      c.leadsAllTime > 0
                        ? "Cannot delete campaign with historical leads (archive instead)"
                        : "Delete campaign"
                    }
                    disabled={c.leadsAllTime > 0}
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Daily Target</th>
                <th className="px-4 py-3 font-medium text-right">Today</th>
                <th className="px-4 py-3 font-medium text-right">Month</th>
                <th className="px-4 py-3 font-medium text-right">Lifetime</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No campaigns created yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onInspectCampaign(c.id)}
                        className="font-semibold text-slate-900 hover:underline text-left"
                      >
                        {c.name}
                      </button>
                      {c.description && (
                        <p className="text-xs text-slate-500 max-w-sm truncate">
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          c.status === "ACTIVE"
                            ? "success"
                            : c.status === "PAUSED"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.dailyTarget}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.leadsToday} ({c.progressPercent}%)
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.leadsThisMonth}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.leadsAllTime}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit campaign"
                          onClick={() => {
                            setFormState({
                              name: c.name,
                              description: c.description || "",
                              dailyTarget: c.dailyTarget,
                              status: c.status,
                            });
                            setEditTarget(c);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {c.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Pause campaign"
                            onClick={() => handleStatusChange(c, "PAUSED")}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={c.status === "ARCHIVED" ? "Reactivate campaign" : "Activate campaign"}
                            onClick={() => handleStatusChange(c, "ACTIVE")}
                          >
                            {c.status === "ARCHIVED" ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {c.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archive campaign"
                            onClick={() => handleStatusChange(c, "ARCHIVED")}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            c.leadsAllTime > 0
                              ? "Cannot delete campaign with historical leads (archive instead)"
                              : "Delete campaign"
                          }
                          disabled={c.leadsAllTime > 0}
                          onClick={() => handleDelete(c)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label>Campaign Name</Label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Digital Nomad"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Daily Team Target</Label>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={formState.dailyTarget}
                  onChange={(e) =>
                    setFormState({ ...formState, dailyTarget: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Initial Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      status: e.target.value as "ACTIVE" | "PAUSED",
                    })
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label>Campaign Name</Label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Daily Team Target</Label>
                <Input
                  type="number"
                  min={1}
                  max={100000}
                  value={formState.dailyTarget}
                  onChange={(e) =>
                    setFormState({ ...formState, dailyTarget: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formState.status}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      status: e.target.value as "ACTIVE" | "PAUSED" | "ARCHIVED",
                    })
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
