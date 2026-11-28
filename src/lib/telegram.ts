import { prisma } from "./db";
import { decryptSecret } from "./crypto";

export interface TelegramConfig {
  enabled: boolean;
  botToken: string | null;
  chatId: string | null;
  source: "database" | "env" | "unconfigured";
}

export interface TelegramTransport {
  sendMessage(params: {
    botToken: string;
    chatId: string;
    text: string;
  }): Promise<{ ok: true; messageId: string } | { ok: false; error: string; retryable: boolean }>;
}

export const defaultTelegramTransport: TelegramTransport = {
  async sendMessage({ botToken, chatId, text }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; description?: string; error_code?: number; result?: { message_id?: number } }
        | null;

      if (res.ok && body?.ok && body.result?.message_id !== undefined) {
        return { ok: true, messageId: String(body.result.message_id) };
      }

      const description = body?.description || `HTTP ${res.status}`;
      // Retry on 429 rate limits or 5xx server errors; 400/401/403/404 are config/payload issues
      // though marking retryable=true for 401/404 allows recovery once admin fixes token/chatId and clicks retry
      const retryable = res.status === 429 || res.status >= 500;
      return { ok: false, error: description, retryable };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error sending Telegram message";
      return { ok: false, error: msg, retryable: true };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      telegramBotTokenEncrypted: true,
      telegramChatId: true,
      telegramEnabled: true,
    },
  });

  let dbToken: string | null = null;
  if (settings?.telegramBotTokenEncrypted) {
    try {
      dbToken = decryptSecret(settings.telegramBotTokenEncrypted);
    } catch (err) {
      console.error("Failed to decrypt Telegram bot token:", err);
    }
  }

  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const envChatId = process.env.TELEGRAM_CHAT_ID?.trim() || null;

  const botToken = dbToken || envToken;
  const chatId = settings?.telegramChatId?.trim() || envChatId;
  const enabled = settings ? settings.telegramEnabled : true;

  let source: TelegramConfig["source"] = "unconfigured";
  if (dbToken || settings?.telegramChatId) {
    source = "database";
  } else if (envToken || envChatId) {
    source = "env";
  }

  return {
    enabled,
    botToken,
    chatId,
    source,
  };
}

const BACKOFF_SECONDS = [5, 15, 60, 300, 900];

export async function processTelegramJob(
  jobId: string,
  transport: TelegramTransport = defaultTelegramTransport
): Promise<{ status: string; skipped?: boolean; error?: string }> {
  const staleCutoff = new Date(Date.now() - 2 * 60 * 1000);

  // Atomic claim ensures no two concurrent workers send duplicate messages for the same job
  const claimed = await prisma.$executeRaw`
    UPDATE "TelegramNotificationJob"
    SET "status" = 'PROCESSING',
        "lockedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${jobId}
      AND "sentAt" IS NULL
      AND "telegramMessageId" IS NULL
      AND (
        "status" IN ('PENDING', 'RETRYING')
        OR ("status" = 'PROCESSING' AND "lockedAt" < ${staleCutoff})
      )
  `;

  if (claimed === 0) {
    return { status: "SKIPPED", skipped: true };
  }

  const job = await prisma.telegramNotificationJob.findUnique({
    where: { id: jobId },
  });
  if (!job || job.sentAt) {
    return { status: "SKIPPED", skipped: true };
  }

  const config = await getTelegramConfig();

  if (!config.enabled) {
    await prisma.telegramNotificationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lockedAt: null,
        lastError: "Telegram integration is disabled in settings.",
      },
    });
    return { status: "FAILED", error: "Telegram integration is disabled" };
  }

  const targetChatId = config.chatId || job.chatId;
  if (!config.botToken || !targetChatId) {
    const nextAttempts = job.attempts + 1;
    const isFinal = nextAttempts >= job.maxAttempts;
    const delaySec = BACKOFF_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SECONDS.length - 1)];
    await prisma.telegramNotificationJob.update({
      where: { id: jobId },
      data: {
        status: isFinal ? "FAILED" : "RETRYING",
        attempts: nextAttempts,
        nextRetryAt: new Date(Date.now() + delaySec * 1000),
        lockedAt: null,
        lastError: "Telegram Bot Token or Chat ID is not configured.",
      },
    });
    return { status: isFinal ? "FAILED" : "RETRYING", error: "Missing Telegram credentials" };
  }

  const result = await transport.sendMessage({
    botToken: config.botToken,
    chatId: targetChatId,
    text: job.messageText,
  });

  if (result.ok) {
    await prisma.telegramNotificationJob.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        chatId: targetChatId,
        telegramMessageId: result.messageId,
        sentAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });
    return { status: "SENT" };
  }

  const nextAttempts = job.attempts + 1;
  const shouldStop = !result.retryable && nextAttempts >= 2;
  const isFinal = shouldStop || nextAttempts >= job.maxAttempts;
  const delaySec = BACKOFF_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SECONDS.length - 1)];

  await prisma.telegramNotificationJob.update({
    where: { id: jobId },
    data: {
      status: isFinal ? "FAILED" : "RETRYING",
      attempts: nextAttempts,
      nextRetryAt: new Date(Date.now() + delaySec * 1000),
      lockedAt: null,
      lastError: result.error.slice(0, 500),
    },
  });

  return { status: isFinal ? "FAILED" : "RETRYING", error: result.error };
}

export async function sweepPendingTelegramJobs(
  transport: TelegramTransport = defaultTelegramTransport
): Promise<number> {
  const now = new Date();
  const dueJobs = await prisma.telegramNotificationJob.findMany({
    where: {
      sentAt: null,
      status: { in: ["PENDING", "RETRYING"] },
      nextRetryAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: { id: true },
  });

  let processed = 0;
  for (const job of dueJobs) {
    await processTelegramJob(job.id, transport);
    processed += 1;
  }
  return processed;
}

export async function retryTelegramJobManually(
  jobId: string,
  transport: TelegramTransport = defaultTelegramTransport
): Promise<{ status: string; error?: string }> {
  const job = await prisma.telegramNotificationJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return { status: "NOT_FOUND", error: "Notification job not found" };
  }
  if (job.sentAt) {
    return { status: "SENT" };
  }

  await prisma.telegramNotificationJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      attempts: 0,
      nextRetryAt: new Date(),
      lockedAt: null,
    },
  });

  return processTelegramJob(jobId, transport);
}

const globalForWorker = globalThis as unknown as {
  telegramWorkerStarted: boolean | undefined;
};

export function ensureTelegramBackgroundWorker(): void {
  if (globalForWorker.telegramWorkerStarted) return;
  globalForWorker.telegramWorkerStarted = true;

  const timer = setInterval(() => {
    void sweepPendingTelegramJobs().catch((err) => {
      console.error("[TelegramWorker] Sweep error:", err);
    });
  }, 10000);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
