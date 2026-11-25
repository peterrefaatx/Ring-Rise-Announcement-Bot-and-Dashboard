import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateCampaignSchema } from "@/lib/validation";
import { sanitizeSingleLineText } from "@/lib/template";
import { getBusinessDateEst } from "@/lib/timezone";
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
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid campaign update" },
      { status: 400 }
    );
  }

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const updateData: Prisma.CampaignUpdateInput = {};
  if (parsed.data.name !== undefined) {
    updateData.name = sanitizeSingleLineText(parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    updateData.description = parsed.data.description
      ? sanitizeSingleLineText(parsed.data.description)
      : null;
  }
  if (parsed.data.dailyTarget !== undefined) {
    updateData.dailyTarget = parsed.data.dailyTarget;
  }
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
  }

  const targetChanged =
    parsed.data.dailyTarget !== undefined && parsed.data.dailyTarget !== existing.dailyTarget;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.update({
        where: { id },
        data: updateData,
      });
      if (targetChanged && parsed.data.dailyTarget !== undefined) {
        await tx.campaignTargetHistory.create({
          data: {
            campaignId: id,
            dailyTarget: parsed.data.dailyTarget,
            effectiveDateEst: getBusinessDateEst(new Date()),
            changedById: auth.user.id,
          },
        });
      }
      return campaign;
    });

    const ip = await getRequestIp();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CAMPAIGN_UPDATED",
      targetType: "Campaign",
      targetId: id,
      details: parsed.data,
      ipAddress: ip,
    });

    await emitActivityEvent("CAMPAIGN_CHANGED", {
      action: "UPDATED",
      campaignId: id,
    });

    return NextResponse.json({
      campaign: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Another campaign already uses this name." },
        { status: 409 }
      );
    }
    console.error("Update campaign failed:", err);
    return NextResponse.json({ error: "Failed to update campaign." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const leadCount = await prisma.leadAnnouncement.count({ where: { campaignId: id } });
  if (leadCount > 0) {
    return NextResponse.json(
      {
        error: `Campaign "${existing.name}" has ${leadCount} historical lead announcements and cannot be deleted. Archive it instead to preserve historical reports.`,
      },
      { status: 409 }
    );
  }

  await prisma.campaign.delete({ where: { id } });

  const ip = await getRequestIp();
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CAMPAIGN_DELETED",
    targetType: "Campaign",
    targetId: id,
    details: { name: existing.name },
    ipAddress: ip,
  });

  await emitActivityEvent("CAMPAIGN_CHANGED", {
    action: "DELETED",
    campaignId: id,
  });

  return NextResponse.json({ ok: true });
}
