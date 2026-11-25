import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const snapshot = await getDashboardSnapshot(auth.user.id);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
