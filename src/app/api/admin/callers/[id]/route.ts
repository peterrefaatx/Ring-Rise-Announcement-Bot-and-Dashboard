import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateCallerSchema } from "@/lib/validation";
import { sanitizeSingleLineText } from "@/lib/template";
import { recordAuditLog } from "@/lib/audit";
import { emitActivityEvent } from "@/lib/realtime";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateCallerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update payload" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt !== null) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (
    id === auth.user.id &&
    (parsed.data.status === "DEACTIVATED" || parsed.data.role === "CALLER")
  ) {
    return NextResponse.json(
      { error: "You cannot deactivate or demote your own admin account." },
      { status: 400 }
    );
  }

  const updateData: Prisma.UserUpdateInput = {};
  if (parsed.data.fullName !== undefined) {
    updateData.fullName = sanitizeSingleLineText(parsed.data.fullName);
  }
  if (parsed.data.username !== undefined) {
    updateData.username = parsed.data.username.trim().toLowerCase();
  }
  if (parsed.data.email !== undefined) {
    updateData.email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;
  }
  if (parsed.data.role !== undefined) {
    updateData.role = parsed.data.role;
  }
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "DEACTIVATED") {
      updateData.tokenVersion = { increment: 1 };
    }
  }
  if (parsed.data.announcementName !== undefined) {
    updateData.announcementName = sanitizeSingleLineText(parsed.data.announcementName);
  }
  if (parsed.data.announcementTemplate !== undefined) {
    updateData.announcementTemplate = sanitizeSingleLineText(parsed.data.announcementTemplate);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          role: true,
          status: true,
          announcementName: true,
          announcementTemplate: true,
          createdAt: true,
        },
      });
      if (parsed.data.status === "DEACTIVATED") {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      return user;
    });

    const ip = await getRequestIp();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CALLER_UPDATED",
      targetType: "User",
      targetId: id,
      details: parsed.data,
      ipAddress: ip,
    });

    await emitActivityEvent("CALLER_CHANGED", {
      action: "UPDATED",
      userId: id,
    });

    return NextResponse.json({
      caller: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Username or email is already in use." },
        { status: 409 }
      );
    }
    console.error("Update caller failed:", err);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt !== null) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const leadCount = await prisma.leadAnnouncement.count({ where: { userId: id } });
  const ip = await getRequestIp();

  if (leadCount > 0) {
    // Soft-delete preserves historical integrity while freeing username/email for reuse
    const suffix = `_deleted_${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: "DEACTIVATED",
          deletedAt: new Date(),
          username: `${target.username}${suffix}`.slice(0, 120),
          email: target.email ? `${target.email}${suffix}` : null,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.session.deleteMany({ where: { userId: id } });
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CALLER_SOFT_DELETED",
      targetType: "User",
      targetId: id,
      details: { preservedLeads: leadCount, originalUsername: target.username },
      ipAddress: ip,
    });
  } else {
    await prisma.user.delete({ where: { id } });
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CALLER_HARD_DELETED",
      targetType: "User",
      targetId: id,
      details: { originalUsername: target.username },
      ipAddress: ip,
    });
  }

  await emitActivityEvent("CALLER_CHANGED", {
    action: "DELETED",
    userId: id,
  });

  return NextResponse.json({ ok: true, softDeleted: leadCount > 0 });
}
