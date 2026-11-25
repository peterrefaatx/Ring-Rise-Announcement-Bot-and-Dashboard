import { after, NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { announceLead, AnnouncementError } from "@/lib/announcements";
import { announceLeadSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { processTelegramJob } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  // Burst protection: allow up to 30 announcements per minute per user
  const rate = checkRateLimit(`announce:${auth.user.id}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait a moment before announcing again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = announceLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid lead announcement payload" },
      { status: 400 }
    );
  }

  try {
    const result = await announceLead(
      {
        userId: auth.user.id,
        campaignId: parsed.data.campaignId,
        idempotencyKey: parsed.data.idempotencyKey,
      },
      { deferTelegramDispatch: true }
    );

    if (result.telegramJobId && !result.deduplicated) {
      const jobId = result.telegramJobId;
      after(async () => {
        await processTelegramJob(jobId).catch((err) => {
          console.error("Background Telegram dispatch failed:", err);
        });
      });
    }

    return NextResponse.json(result, {
      status: result.deduplicated ? 200 : 201,
    });
  } catch (err) {
    if (err instanceof AnnouncementError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Lead announcement error:", err);
    return NextResponse.json(
      { error: "Failed to register lead announcement." },
      { status: 500 }
    );
  }
}
