import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    user: {
      id: auth.user.id,
      fullName: auth.user.fullName,
      username: auth.user.username,
      email: auth.user.email,
      role: auth.user.role,
      status: auth.user.status,
      announcementName: auth.user.announcementName,
      announcementTemplate: auth.user.announcementTemplate,
      createdAt: auth.user.createdAt.toISOString(),
    },
  });
}
