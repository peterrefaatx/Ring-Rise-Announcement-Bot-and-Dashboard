import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import {
  getDashboardSnapshot,
  getLatestDashboardEventSeq,
} from "@/lib/dashboard";
import { getBusinessDateEst } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const sinceSeqRaw = request.nextUrl.searchParams.get("sinceSeq");
  const clientDate = request.nextUrl.searchParams.get("date");

  if (sinceSeqRaw !== null && clientDate !== null) {
    const sinceSeq = Number.parseInt(sinceSeqRaw, 10);
    const currentDateEst = getBusinessDateEst(new Date());
    if (Number.isFinite(sinceSeq) && sinceSeq >= 0 && clientDate === currentDateEst) {
      const latestSeq = await getLatestDashboardEventSeq();
      if (latestSeq <= sinceSeq) {
        return NextResponse.json(
          {
            unchanged: true,
            latestEventSeq: latestSeq,
            businessDateEst: currentDateEst,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }
  }

  const snapshot = await getDashboardSnapshot(auth.user.id);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
