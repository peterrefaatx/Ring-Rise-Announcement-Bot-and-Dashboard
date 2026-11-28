import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation";
import { sanitizeSingleLineText } from "@/lib/template";
import { emitActivityEvent } from "@/lib/realtime";
import { invalidateCachePrefix } from "@/lib/cache";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      profile: {
        id: auth.user.id,
        fullName: auth.user.fullName,
        username: auth.user.username,
        email: auth.user.email,
        role: auth.user.role,
        announcementName: auth.user.announcementName,
        announcementTemplate: auth.user.announcementTemplate,
        createdAt: auth.user.createdAt.toISOString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid profile settings" },
      { status: 400 }
    );
  }

  const announcementName = sanitizeSingleLineText(parsed.data.announcementName);
  const announcementTemplate = sanitizeSingleLineText(parsed.data.announcementTemplate);

  if (!announcementName) {
    return NextResponse.json(
      { error: "Announcement name cannot be empty." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      announcementName,
      announcementTemplate,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      role: true,
      announcementName: true,
      announcementTemplate: true,
    },
  });

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "PROFILE_UPDATED",
    targetType: "User",
    targetId: auth.user.id,
    details: { announcementName },
    ipAddress: ip,
  });

  invalidateCachePrefix("session:");
  invalidateCachePrefix("dashboard:");

  await emitActivityEvent("CALLER_CHANGED", {
    action: "PROFILE_UPDATED",
    userId: updated.id,
    announcementName: updated.announcementName,
  });

  return NextResponse.json(
    { profile: updated },
    { headers: { "Cache-Control": "no-store" } }
  );
}
