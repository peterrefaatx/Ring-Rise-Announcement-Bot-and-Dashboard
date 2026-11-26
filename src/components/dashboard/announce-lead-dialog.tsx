"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Megaphone, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            {step === "select" ? "Select Campaign for New Lead" : "Confirm Lead Announcement"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {campaigns.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active campaigns are currently available. Ask an administrator to activate a campaign.
              </div>
            ) : (
              campaigns.map((campaign) => {
                const isSelected = campaign.id === selectedCampaignId;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={cn(
                      "w-full rounded-lg border p-3.5 text-left transition-all flex items-center justify-between gap-3",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {campaign.leadsToday} / {campaign.dailyTarget} leads today ({campaign.progressPercent}%)
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {campaign.targetReached && (
                        <Badge variant="success">Target Met</Badge>
                      )}
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center",
                          isSelected ? "border-primary bg-primary" : "border-slate-300"
                        )}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
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
