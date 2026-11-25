import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getCallerHistoryAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const history = await getCallerHistoryAnalytics(auth.user.id);
  if (!history) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(history, {
    headers: { "Cache-Control": "no-store" },
  });
}
