import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCampaignSchema } from "@/lib/validation";
import { sanitizeSingleLineText } from "@/lib/template";
import { getBusinessDateEst, getBusinessMonthEst } from "@/lib/timezone";
import { recordAuditLog } from "@/lib/audit";
import { emitActivityEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const campaigns = await prisma.campaign.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const todayEst = getBusinessDateEst(now);
  const monthEst = getBusinessMonthEst(now);

  const [todayCounts, monthCounts, totalCounts] = await Promise.all([
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: { businessDateEst: todayEst },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      where: { businessMonthEst: monthEst },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["campaignId"],
      _count: { id: true },
    }),
  ]);

  const todayMap = new Map(todayCounts.map((r) => [r.campaignId, r._count.id]));
  const monthMap = new Map(monthCounts.map((r) => [r.campaignId, r._count.id]));
  const totalMap = new Map(totalCounts.map((r) => [r.campaignId, r._count.id]));

  return NextResponse.json({
    campaigns: campaigns.map((c) => {
      const leadsToday = todayMap.get(c.id) ?? 0;
      return {
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        leadsToday,
        leadsThisMonth: monthMap.get(c.id) ?? 0,
        leadsAllTime: totalMap.get(c.id) ?? 0,
        progressPercent:
          c.dailyTarget > 0 ? Math.min(100, Math.round((leadsToday / c.dailyTarget) * 100)) : 0,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid campaign payload" },
      { status: 400 }
    );
  }

  const name = sanitizeSingleLineText(parsed.data.name);
  const description = parsed.data.description
    ? sanitizeSingleLineText(parsed.data.description)
    : null;
  const todayEst = getBusinessDateEst(new Date());

  try {
    const created = await prisma.campaign.create({
      data: {
        name,
        description,
        dailyTarget: parsed.data.dailyTarget,
        status: parsed.data.status,
        targetHistory: {
          create: {
            dailyTarget: parsed.data.dailyTarget,
            effectiveDateEst: todayEst,
            changedById: auth.user.id,
          },
        },
      },
    });

    const ip = await getRequestIp();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CAMPAIGN_CREATED",
      targetType: "Campaign",
      targetId: created.id,
      details: { name: created.name, dailyTarget: created.dailyTarget },
      ipAddress: ip,
    });

    await emitActivityEvent("CAMPAIGN_CHANGED", {
      action: "CREATED",
      campaignId: created.id,
    });

    return NextResponse.json(
      {
        campaign: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "A campaign with this name already exists." },
        { status: 409 }
      );
    }
    console.error("Create campaign failed:", err);
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }
}
