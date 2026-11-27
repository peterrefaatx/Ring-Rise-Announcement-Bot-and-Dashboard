"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Megaphone, ArrowLeft, Search, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CampaignProgressItem } from "@/lib/dashboard";
import { renderAnnouncementMessage } from "@/lib/template";
import { cn } from "@/lib/utils";

interface AnnounceLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: CampaignProgressItem[];
  announcementName: string;
  announcementTemplate: string;
  onSuccess: () => void;
}

export function AnnounceLeadDialog({
  open,
  onOpenChange,
  campaigns,
  announcementName,
  announcementTemplate,
  onSuccess,
}: AnnounceLeadDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [campaignSearch, setCampaignSearch] = useState<string>("");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    const query = campaignSearch.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter((c) => c.name.toLowerCase().includes(query));
  }, [campaigns, campaignSearch]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const previewText = useMemo(() => {
    if (!selectedCampaign) return "";
    return renderAnnouncementMessage(
      announcementTemplate,
      announcementName,
      selectedCampaign.name
    );
  }, [announcementTemplate, announcementName, selectedCampaign]);

  function resetDialogState(nextOpen: boolean) {
    if (!nextOpen && submitting) return;
    setStep("select");
    setSelectedCampaignId("");
    setCampaignSearch("");
    setIdempotencyKey("");
    setErrorMessage(null);
    onOpenChange(nextOpen);
  }

  function handleContinueToConfirm() {
    if (!selectedCampaign) return;
    setErrorMessage(null);
    setIdempotencyKey(crypto.randomUUID());
    setStep("confirm");
  }

  async function handleConfirmAnnouncement() {
    if (!selectedCampaign || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          idempotencyKey: idempotencyKey || crypto.randomUUID(),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        deduplicated?: boolean;
        announcement?: { campaignName: string };
      } | null;

      if (!res.ok) {
        const msg = data?.error || "Could not announce lead. Please try again.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      toast.success(
        `Lead announced in ${data?.announcement?.campaignName || selectedCampaign.name}!`
      );
      setStep("select");
      setSelectedCampaignId("");
      setCampaignSearch("");
      setIdempotencyKey("");
      onOpenChange(false);
      onSuccess();
    } catch {
      const msg = "Network error while registering lead. Please retry.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetDialogState}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {step === "select" ? "Select Campaign for New Lead" : "Confirm Lead Announcement"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="mt-3 space-y-3">
            {campaigns.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="pl-9"
                />
              </div>
            )}
            <div className="max-h-72 overflow-y-auto pr-1">
              {campaigns.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No active campaigns are currently available. Ask an administrator to activate a campaign.
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No matching campaigns found.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  {filteredCampaigns.map((campaign) => {
                    const isSelected = campaign.id === selectedCampaignId;
                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        className={cn(
                          "w-full rounded-lg border p-3 sm:p-3.5 text-left transition-all flex flex-col justify-between gap-2",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <p className="font-medium text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
                            {campaign.name}
                          </p>
                          <div
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0 rounded-full border flex items-center justify-center",
                              isSelected ? "border-primary bg-primary" : "border-slate-300"
                            )}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 w-full">
                          <span className="tabular-nums">
                            {campaign.leadsToday}/{campaign.dailyTarget} ({campaign.progressPercent}%)
                          </span>
                          {campaign.targetReached && (
                            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                              Target Met
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Selected Campaign</span>
                <span className="font-medium text-slate-900">1 Lead</span>
              </div>
              <p className="text-base font-semibold text-slate-900">
                {selectedCampaign?.name}
              </p>
            </div>

            <div className="rounded-lg border border-primary/25 bg-primary/10 p-4 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Telegram Message Preview
              </p>
              <p className="text-sm font-medium text-foreground">{previewText}</p>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "select" ? (
            <>
              <Button variant="outline" onClick={() => resetDialogState(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedCampaign}
                onClick={handleContinueToConfirm}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleConfirmAnnouncement}
                disabled={submitting}
              >
                {submitting ? (
                  "Announcing..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <Send className="h-3.5 w-3.5" />
                    Confirm & Announce Lead
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
