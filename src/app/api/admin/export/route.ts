import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import {
  getCallerHistoryAnalytics,
  getCampaignHistoryAnalytics,
  getDailyDetailAnalytics,
  getMonthlyDetailAnalytics,
} from "@/lib/analytics";
import { getLeaderboardForRange } from "@/lib/leaderboard";
import { buildCsvBuffer, buildExcelBuffer } from "@/lib/export";
import {
  formatEstDateTime,
  getBusinessDateEst,
  getBusinessMonthEst,
} from "@/lib/timezone";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const type = request.nextUrl.searchParams.get("type") || "daily";
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const dateParam = request.nextUrl.searchParams.get("date") || getBusinessDateEst(new Date());
  const monthParam =
    request.nextUrl.searchParams.get("month") || getBusinessMonthEst(new Date());
  const callerId = request.nextUrl.searchParams.get("callerId");
  const campaignId = request.nextUrl.searchParams.get("campaignId");

  let filenameBase = `report-${type}`;
  let sheetName = "Report";
  let headers: string[] = [];
  let rows: Array<Array<string | number | null>> = [];

  try {
    if (type === "daily") {
      const detail = await getDailyDetailAnalytics(dateParam);
      filenameBase = `daily-report-${dateParam}`;
      sheetName = `Daily ${dateParam}`;
      headers = ["Rank", "Announcement Name", "Full Name", "Status", "Leads", "Achieved At"];
      rows = detail.leaderboard.map((e) => [
        e.rank,
        e.announcementName,
        e.fullName,
        e.status,
        e.leadCount,
        e.achievedAt ? formatEstDateTime(e.achievedAt) : "-",
      ]);
    } else if (type === "monthly") {
      const detail = await getMonthlyDetailAnalytics(monthParam);
      filenameBase = `monthly-report-${monthParam}`;
      sheetName = `Monthly ${monthParam}`;
      headers = ["Rank", "Announcement Name", "Full Name", "Status", "Leads", "Achieved At"];
      rows = detail.leaderboard.map((e) => [
        e.rank,
        e.announcementName,
        e.fullName,
        e.status,
        e.leadCount,
        e.achievedAt ? formatEstDateTime(e.achievedAt) : "-",
      ]);
    } else if (type === "all-time") {
      const board = await getLeaderboardForRange({ includeZeroLeadActiveCallers: false });
      filenameBase = `all-time-performance-${getBusinessDateEst(new Date())}`;
      sheetName = "All-Time";
      headers = ["Rank", "Announcement Name", "Full Name", "Status", "Lifetime Leads", "Last Lead"];
      rows = board.map((e) => [
        e.rank,
        e.announcementName,
        e.fullName,
        e.status,
        e.leadCount,
        e.achievedAt ? formatEstDateTime(e.achievedAt) : "-",
      ]);
    } else if (type === "caller") {
      if (!callerId) {
        return NextResponse.json({ error: "callerId is required" }, { status: 400 });
      }
      const detail = await getCallerHistoryAnalytics(callerId);
      if (!detail) {
        return NextResponse.json({ error: "Caller not found" }, { status: 404 });
      }
      filenameBase = `caller-${detail.caller.username}-${getBusinessDateEst(new Date())}`;
      sheetName = detail.caller.announcementName;
      headers = ["Business Date", "Campaign", "Message", "Timestamp"];
      rows = detail.recentAnnouncements.map((a) => [
        a.businessDateEst,
        a.campaignName,
        a.renderedMessage,
        formatEstDateTime(a.createdAt),
      ]);
      if (rows.length === 0) {
        rows = [["-", "-", "No announcements recorded", "-"]];
      }
    } else if (type === "campaign") {
      if (!campaignId) {
        return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
      }
      const detail = await getCampaignHistoryAnalytics(campaignId);
      if (!detail) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      filenameBase = `campaign-${detail.campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      sheetName = detail.campaign.name;
      headers = ["Business Date", "Leads", "Effective Daily Target", "Target Achievement (%)"];
      rows = detail.dailyHistory.map((d) => [
        d.businessDateEst,
        d.leadCount,
        d.effectiveTarget,
        `${d.achievementPercent}%`,
      ]);
    } else {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const ip = await getRequestIp();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "REPORT_EXPORTED",
      targetType: "Report",
      targetId: filenameBase,
      details: { type, format },
      ipAddress: ip,
    });

    if (format === "xlsx") {
      const buffer = await buildExcelBuffer(sheetName, headers, rows);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csvBuffer = buildCsvBuffer(headers, rows);
    return new Response(new Uint8Array(csvBuffer), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 });
  }
}
