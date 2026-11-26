import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateCachePrefix } from "@/lib/cache";
import { recordAuditLog } from "@/lib/audit";
import { realtimeBroker, recordActivityEventTx } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const resetAllLeadsSchema = z.object({
  confirm: z.literal("RESET"),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = resetAllLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please type "RESET" to confirm deleting all leads.' },
      { status: 400 }
    );
  }

  const { deletedCount, activityEvent } = await prisma.$transaction(async (tx) => {
    const deleted = await tx.leadAnnouncement.deleteMany({});
    const event = await recordActivityEventTx(tx, "SETTINGS_CHANGED", {
      action: "LEADS_RESET",
      deletedCount: deleted.count,
    });
    return {
      deletedCount: deleted.count,
      activityEvent: event,
    };
  });

  realtimeBroker.dispatchUnique(activityEvent);
  invalidateCachePrefix("dashboard:");
  invalidateCachePrefix("analytics:");

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "LEADS_RESET",
    targetType: "LeadAnnouncement",
    targetId: "all",
    details: { deletedCount },
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true, deletedCount });
}
