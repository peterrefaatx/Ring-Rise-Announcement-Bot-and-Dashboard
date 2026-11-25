import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import {
  getCallerHistoryAnalytics,
  getCampaignHistoryAnalytics,
  getDailyDetailAnalytics,
  getDailySummaryList,
  getMonthlyDetailAnalytics,
  getMonthlySummaryList,
} from "@/lib/analytics";
import { getBusinessDateEst, getBusinessMonthEst } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const type = request.nextUrl.searchParams.get("type") || "daily";
  const dateParam = request.nextUrl.searchParams.get("date");
  const monthParam = request.nextUrl.searchParams.get("month");
  const callerId = request.nextUrl.searchParams.get("callerId");
  const campaignId = request.nextUrl.searchParams.get("campaignId");

  try {
    if (type === "daily") {
      const targetDate = dateParam || getBusinessDateEst(new Date());
      const [summaries, detail] = await Promise.all([
        getDailySummaryList(45),
        getDailyDetailAnalytics(targetDate),
      ]);
      return NextResponse.json({ summaries, detail });
    }

    if (type === "monthly") {
      const targetMonth = monthParam || getBusinessMonthEst(new Date());
      const [summaries, detail] = await Promise.all([
        getMonthlySummaryList(24),
        getMonthlyDetailAnalytics(targetMonth),
      ]);
      return NextResponse.json({ summaries, detail });
    }

    if (type === "caller") {
      if (!callerId) {
        return NextResponse.json({ error: "callerId is required" }, { status: 400 });
      }
      const detail = await getCallerHistoryAnalytics(callerId);
      if (!detail) {
        return NextResponse.json({ error: "Caller not found" }, { status: 404 });
      }
      return NextResponse.json({ detail });
    }

    if (type === "campaign") {
      if (!campaignId) {
        return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
      }
      const detail = await getCampaignHistoryAnalytics(campaignId);
      if (!detail) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      return NextResponse.json({ detail });
    }

    return NextResponse.json({ error: "Unsupported analytics type" }, { status: 400 });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics" },
      { status: 400 }
    );
  }
}
