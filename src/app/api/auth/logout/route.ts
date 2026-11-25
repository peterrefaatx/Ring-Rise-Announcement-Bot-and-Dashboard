import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";

export async function POST() {
  await revokeCurrentSession();
  const response = NextResponse.json({ ok: true });
  await clearSessionCookie(response);
  return response;
}
