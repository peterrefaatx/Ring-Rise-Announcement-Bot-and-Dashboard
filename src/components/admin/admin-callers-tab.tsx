"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  Trash2,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminCallerRow {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  role: "ADMIN" | "CALLER";
  status: "ACTIVE" | "DEACTIVATED";
  deletedAt: string | null;
  announcementName: string;
  announcementTemplate: string;
  createdAt: string;
  leadsToday: number;
  leadsThisMonth: number;
  leadsAllTime: number;
}

export function AdminCallersTab({
  currentUserId,
  refreshSignal,
  onInspectCaller,
}: {
  currentUserId: string;
  refreshSignal: number;
  onInspectCaller: (callerId: string) => void;
}) {
  const [callers, setCallers] = useState<AdminCallerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCallerRow | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminCallerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCallerRow | null>(null);

  const [formState, setFormState] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "CALLER" as "ADMIN" | "CALLER",
    announcementName: "",
    announcementTemplate: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCallers = useCallback(async () => {
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/admin/callers${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { callers: AdminCallerRow[] };
      setCallers(data.callers);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadCallers();
  }, [loadCallers, refreshSignal]);

  function openCreateDialog() {
    setFormState({
      fullName: "",
      username: "",
      email: "",
      password: "",
      role: "CALLER",
      announcementName: "",
      announcementTemplate: "",
    });
    setCreateOpen(true);
  }

  function openEditDialog(caller: AdminCallerRow) {
    setFormState({
      fullName: caller.fullName,
      username: caller.username,
      email: caller.email || "",
      password: "",
      role: caller.role,
      announcementName: caller.announcementName,
      announcementTemplate: caller.announcementTemplate,
    });
    setEditTarget(caller);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/callers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formState.fullName,
          username: formState.username,
          email: formState.email,
          password: formState.password,
          role: formState.role,
          announcementName: formState.announcementName || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to create account");
        return;
      }
      toast.success("Account created successfully");
      setCreateOpen(false);
      await loadCallers();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/callers/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formState.fullName,
          username: formState.username,
          email: formState.email,
          role: formState.role,
          announcementName: formState.announcementName,
          announcementTemplate: formState.announcementTemplate,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to update account");
        return;
      }
      toast.success("Account updated");
      setEditTarget(null);
      await loadCallers();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(caller: AdminCallerRow) {
    const nextStatus = caller.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    const res = await fetch(`/api/admin/callers/${caller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      toast.error(data?.error || "Could not change status");
      return;
    }
    toast.success(
      nextStatus === "ACTIVE" ? `${caller.fullName} activated` : `${caller.fullName} deactivated`
    );
    await loadCallers();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/callers/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to reset password");
        return;
      }
      toast.success(`Password reset for @${resetTarget.username}. Active sessions revoked.`);
      setResetTarget(null);
      setNewPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/callers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        softDeleted?: boolean;
      } | null;
      if (!res.ok) {
        toast.error(data?.error || "Failed to delete user");
        return;
      }
      toast.success(
        data?.softDeleted
          ? "Account archived (historical leads preserved)"
          : "Account permanently deleted"
      );
      setDeleteTarget(null);
      await loadCallers();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Caller & Account Management</CardTitle>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="h-4 w-4" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, display name..."
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Name / Username</th>
                <th className="px-4 py-3 font-medium">Telegram Name</th>
                <th className="px-4 py-3 font-medium">Role & Status</th>
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
                    Loading accounts...
                  </td>
                </tr>
              ) : callers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No matching accounts found.
                  </td>
                </tr>
              ) : (
                callers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onInspectCaller(c.id)}
                        className="font-medium text-slate-900 hover:underline text-left"
                      >
                        {c.fullName}
                      </button>
                      <p className="text-xs text-slate-500 font-mono">
                        @{c.username}
                        {c.email ? ` · ${c.email}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{c.announcementName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={c.role === "ADMIN" ? "default" : "secondary"}>
                          {c.role}
                        </Badge>
                        <Badge variant={c.status === "ACTIVE" ? "success" : "warning"}>
                          {c.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.leadsToday}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.leadsThisMonth}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.leadsAllTime}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit account"
                          onClick={() => openEditDialog(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => {
                            setNewPassword("");
                            setResetTarget(c);
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {c.id !== currentUserId && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              onClick={() => handleToggleStatus(c)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete account"
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Username</Label>
                <Input
                  value={formState.username}
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Announcement Name</Label>
                <Input
                  value={formState.announcementName}
                  placeholder="Defaults to first name"
                  onChange={(e) =>
                    setFormState({ ...formState, announcementName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Initial Password</Label>
                <PasswordInput
                  minLength={8}
                  value={formState.password}
                  onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formState.role}
                  onChange={(e) =>
                    setFormState({ ...formState, role: e.target.value as "ADMIN" | "CALLER" })
                  }
                >
                  <option value="CALLER">CALLER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Username</Label>
                <Input
                  value={formState.username}
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formState.role}
                  disabled={editTarget?.id === currentUserId}
                  onChange={(e) =>
                    setFormState({ ...formState, role: e.target.value as "ADMIN" | "CALLER" })
                  }
                >
                  <option value="CALLER">CALLER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Announcement Display Name</Label>
              <Input
                value={formState.announcementName}
                onChange={(e) =>
                  setFormState({ ...formState, announcementName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Telegram Announcement Template</Label>
              <Textarea
                value={formState.announcementTemplate}
                onChange={(e) =>
                  setFormState({ ...formState, announcementTemplate: e.target.value })
                }
                required
              />
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

      {/* Reset Password Dialog */}
      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label>New Password (min 8 characters)</Label>
              <PasswordInput
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            {deleteTarget && deleteTarget.leadsAllTime > 0
              ? `${deleteTarget.fullName} has ${deleteTarget.leadsAllTime} historical lead records. Deleting will archive the account and revoke login access while keeping historical statistics intact.`
              : `Permanently delete ${deleteTarget?.fullName}? This action cannot be undone.`}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
