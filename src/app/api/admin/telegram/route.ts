import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  defaultTelegramTransport,
  getTelegramConfig,
  retryTelegramJobManually,
} from "@/lib/telegram";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const [jobs, counts] = await Promise.all([
    prisma.telegramNotificationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        announcement: {
          select: {
            callerNameSnapshot: true,
            campaignNameSnapshot: true,
            businessDateEst: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.telegramNotificationJob.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    SENT: 0,
    PENDING: 0,
    RETRYING: 0,
    PROCESSING: 0,
    FAILED: 0,
  };
  for (const row of counts) {
    statusCounts[row.status] = row._count.id;
  }

  return NextResponse.json({
    counts: statusCounts,
    jobs: jobs.map((j) => ({
      id: j.id,
      announcementId: j.announcementId,
      callerName: j.announcement.callerNameSnapshot,
      campaignName: j.announcement.campaignNameSnapshot,
      messageText: j.messageText,
      status: j.status,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      lastError: j.lastError,
      telegramMessageId: j.telegramMessageId,
      sentAt: j.sentAt?.toISOString() ?? null,
      nextRetryAt: j.nextRetryAt.toISOString(),
      createdAt: j.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    jobId?: string;
  } | null;

  const ip = await getRequestIp();

  if (body?.action === "test") {
    const config = await getTelegramConfig();
    if (!config.botToken || !config.chatId) {
      return NextResponse.json(
        { error: "Please configure both Telegram Bot Token and Chat ID first." },
        { status: 400 }
      );
    }

    const res = await defaultTelegramTransport.sendMessage({
      botToken: config.botToken,
      chatId: config.chatId,
      text: "Test notification: Telegram integration is configured and connected.",
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "TELEGRAM_TEST_SENT",
      targetType: "Telegram",
      details: { ok: res.ok, error: res.ok ? null : res.error },
      ipAddress: ip,
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Telegram error: ${res.error}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, messageId: res.messageId });
  }

  if (body?.action === "retry" && body.jobId) {
    const result = await retryTelegramJobManually(body.jobId);
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "TELEGRAM_JOB_RETRIED",
      targetType: "TelegramNotificationJob",
      targetId: body.jobId,
      details: result,
      ipAddress: ip,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid Telegram action" }, { status: 400 });
}
