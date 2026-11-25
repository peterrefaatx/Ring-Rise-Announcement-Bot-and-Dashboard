import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getBusinessDateEst, getBusinessMonthEst } from "./timezone";
import { renderAnnouncementMessage } from "./template";
import { realtimeBroker, recordActivityEventTx } from "./realtime";
import { getTelegramConfig, processTelegramJob } from "./telegram";

export class AnnouncementError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AnnouncementError";
  }
}

export interface AnnounceLeadResult {
  deduplicated: boolean;
  announcement: {
    id: string;
    seq: number;
    userId: string;
    campaignId: string;
    callerName: string;
    campaignName: string;
    renderedMessage: string;
    businessDateEst: string;
    businessMonthEst: string;
    createdAt: string;
  };
  telegramJobId: string | null;
}

export async function announceLead(
  params: {
    userId: string;
    campaignId: string;
    idempotencyKey: string;
  },
  options?: {
    deferTelegramDispatch?: boolean;
  }
): Promise<AnnounceLeadResult> {
  const { userId, campaignId, idempotencyKey } = params;

  const existing = await prisma.leadAnnouncement.findUnique({
    where: {
      userId_idempotencyKey: { userId, idempotencyKey },
    },
    include: { telegramJob: { select: { id: true } } },
  });

  if (existing) {
    return {
      deduplicated: true,
      announcement: {
        id: existing.id,
        seq: existing.seq,
        userId: existing.userId,
        campaignId: existing.campaignId,
        callerName: existing.callerNameSnapshot,
        campaignName: existing.campaignNameSnapshot,
        renderedMessage: existing.renderedMessage,
        businessDateEst: existing.businessDateEst,
        businessMonthEst: existing.businessMonthEst,
        createdAt: existing.createdAt.toISOString(),
      },
      telegramJobId: existing.telegramJob?.id ?? null,
    };
  }

  const telegramConfig = await getTelegramConfig();

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user || user.deletedAt !== null || user.status !== "ACTIVE") {
        throw new AnnouncementError("Your account is not active.", 403);
      }

      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign || campaign.deletedAt !== null) {
        throw new AnnouncementError("Selected campaign was not found.", 404);
      }
      if (campaign.status !== "ACTIVE") {
        throw new AnnouncementError(
          `Campaign "${campaign.name}" is ${campaign.status.toLowerCase()} and cannot accept new leads.`,
          400
        );
      }

      const now = new Date();
      const businessDateEst = getBusinessDateEst(now);
      const businessMonthEst = getBusinessMonthEst(now);
      const renderedMessage = renderAnnouncementMessage(
        user.announcementTemplate,
        user.announcementName,
        campaign.name
      );

      const created = await tx.leadAnnouncement.create({
        data: {
          userId: user.id,
          campaignId: campaign.id,
          idempotencyKey,
          callerNameSnapshot: user.announcementName,
          campaignNameSnapshot: campaign.name,
          renderedMessage,
          businessDateEst,
          businessMonthEst,
          createdAt: now,
        },
      });

      const job = await tx.telegramNotificationJob.create({
        data: {
          announcementId: created.id,
          chatId: telegramConfig.chatId ?? "",
          messageText: renderedMessage,
          status: telegramConfig.enabled ? "PENDING" : "FAILED",
          lastError: telegramConfig.enabled
            ? null
            : "Telegram integration is disabled in settings.",
        },
      });

      const event = await recordActivityEventTx(tx, "LEAD_ANNOUNCED", {
        announcementId: created.id,
        announcementSeq: created.seq,
        userId: user.id,
        callerName: created.callerNameSnapshot,
        campaignId: campaign.id,
        campaignName: created.campaignNameSnapshot,
        renderedMessage: created.renderedMessage,
        businessDateEst: created.businessDateEst,
        businessMonthEst: created.businessMonthEst,
        createdAt: created.createdAt.toISOString(),
      });

      return { created, job, event };
    });

    realtimeBroker.dispatchUnique(txResult.event);

    if (!options?.deferTelegramDispatch && telegramConfig.enabled) {
      void processTelegramJob(txResult.job.id).catch((err) => {
        console.error("Async Telegram dispatch failed:", err);
      });
    }

    return {
      deduplicated: false,
      announcement: {
        id: txResult.created.id,
        seq: txResult.created.seq,
        userId: txResult.created.userId,
        campaignId: txResult.created.campaignId,
        callerName: txResult.created.callerNameSnapshot,
        campaignName: txResult.created.campaignNameSnapshot,
        renderedMessage: txResult.created.renderedMessage,
        businessDateEst: txResult.created.businessDateEst,
        businessMonthEst: txResult.created.businessMonthEst,
        createdAt: txResult.created.createdAt.toISOString(),
      },
      telegramJobId: txResult.job.id,
    };
  } catch (err) {
    // Handle concurrent duplicate submission race on (userId, idempotencyKey)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const concurrent = await prisma.leadAnnouncement.findUnique({
        where: {
          userId_idempotencyKey: { userId, idempotencyKey },
        },
        include: { telegramJob: { select: { id: true } } },
      });
      if (concurrent) {
        return {
          deduplicated: true,
          announcement: {
            id: concurrent.id,
            seq: concurrent.seq,
            userId: concurrent.userId,
            campaignId: concurrent.campaignId,
            callerName: concurrent.callerNameSnapshot,
            campaignName: concurrent.campaignNameSnapshot,
            renderedMessage: concurrent.renderedMessage,
            businessDateEst: concurrent.businessDateEst,
            businessMonthEst: concurrent.businessMonthEst,
            createdAt: concurrent.createdAt.toISOString(),
          },
          telegramJobId: concurrent.telegramJob?.id ?? null,
        };
      }
    }
    throw err;
  }
}
