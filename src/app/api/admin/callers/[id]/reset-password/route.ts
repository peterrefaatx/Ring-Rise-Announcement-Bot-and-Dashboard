import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { resetPasswordSchema } from "@/lib/validation";
import { recordAuditLog } from "@/lib/audit";
import { invalidateCachePrefix } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid password" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt !== null) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        passwordHash: hashPassword(parsed.data.newPassword),
        tokenVersion: { increment: 1 },
      },
    });
    await tx.session.deleteMany({ where: { userId: id } });
  });

  invalidateCachePrefix("session:");

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CALLER_PASSWORD_RESET",
    targetType: "User",
    targetId: id,
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true });
}
