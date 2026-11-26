import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLeaderboardForRange } from "@/lib/leaderboard";
import { defaultTelegramTransport, getTelegramConfig } from "@/lib/telegram";
import {
  getBusinessDateEst,
  getEstDayRangeUtc,
  toEstWallClock,
} from "@/lib/timezone";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";

const summarySchema = z.object({
  type: z.enum(["campaigns", "callers"]),
});

function formatEstTimestampWithSeconds(date: Date): string {
  const est = toEstWallClock(date);
  return est.toISOString().slice(0, 19).replace("T", " ") + " EST";
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const rate = checkRateLimit(`tg-summary:${auth.user.id}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many summary messages sent. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = summarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid summary type." }, { status: 400 });
  }

  const config = await getTelegramConfig();
  if (!config.enabled) {
    return NextResponse.json(
      { error: "Telegram integration is disabled in settings." },
      { status: 400 }
    );
  }
  if (!config.botToken || !config.chatId) {
    return NextResponse.json(
      { error: "Telegram Bot Token or Chat ID is not configured." },
      { status: 400 }
    );
  }

  const now = new Date();
  const businessDateEst = getBusinessDateEst(now);
  const { startUtc } = getEstDayRangeUtc(businessDateEst);
  const endInclusivePlusOneMs = new Date(now.getTime() + 1);
  const stamp = formatEstTimestampWithSeconds(now);

  let messageText = "";

  if (parsed.data.type === "campaigns") {
    const [activeCampaigns, counts] = await Promise.all([
      prisma.campaign.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
      prisma.leadAnnouncement.groupBy({
        by: ["campaignId"],
        where: {
          createdAt: { gte: startUtc, lte: now },
        },
        _count: { id: true },
      }),
    ]);

    const countMap = new Map(counts.map((c) => [c.campaignId, c._count.id]));
    const lines = activeCampaigns.map((c) => {
      const leads = countMap.get(c.id) ?? 0;
      const pct = c.dailyTarget > 0 ? Math.round((leads / c.dailyTarget) * 100) : 0;
      return `• ${c.name}: ${leads} / ${c.dailyTarget} leads (${pct}%)`;
    });

    const totalLeads = activeCampaigns.reduce(
      (sum, c) => sum + (countMap.get(c.id) ?? 0),
      0
    );
    const totalTarget = activeCampaigns.reduce((sum, c) => sum + c.dailyTarget, 0);
    const totalPct = totalTarget > 0 ? Math.round((totalLeads / totalTarget) * 100) : 0;

    messageText = [
      `📊 Today's Campaign Progress (${stamp})`,
      "",
      ...(lines.length > 0 ? lines : ["No active campaigns."]),
      "",
      `Total Today: ${totalLeads} / ${totalTarget} leads (${totalPct}%)`,
    ].join("\n");
  } else {
    const callers = await getLeaderboardForRange({
      startUtc,
      endUtc: endInclusivePlusOneMs,
      includeZeroLeadActiveCallers: true,
    });

    const lines = callers.map((c) => {
      const unit = c.leadCount === 1 ? "lead" : "leads";
      return `${c.rank}. ${c.fullName}: ${c.leadCount} ${unit}`;
    });
    const teamTotal = callers.reduce((sum, c) => sum + c.leadCount, 0);

    messageText = [
      `🏆 Today's Callers Progress (${stamp})`,
      "",
      ...(lines.length > 0 ? lines : ["No active callers found."]),
      "",
      `Team Total: ${teamTotal} ${teamTotal === 1 ? "lead" : "leads"}`,
    ].join("\n");
  }

  const sent = await defaultTelegramTransport.sendMessage({
    botToken: config.botToken,
    chatId: config.chatId,
    text: messageText,
  });

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "TELEGRAM_SUMMARY_SENT",
    targetType: "Telegram",
    details: {
      summaryType: parsed.data.type,
      ok: sent.ok,
      error: sent.ok ? null : sent.error,
    },
    ipAddress: ip,
  });

  if (!sent.ok) {
    return NextResponse.json(
      { error: `Telegram error: ${sent.error}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    messageId: sent.messageId,
    sentAt: now.toISOString(),
  });
}
