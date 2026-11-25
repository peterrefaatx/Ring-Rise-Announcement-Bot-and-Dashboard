import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiAuth, getRequestIp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createCallerSchema } from "@/lib/validation";
import { DEFAULT_ANNOUNCEMENT_TEMPLATE, sanitizeSingleLineText } from "@/lib/template";
import { getBusinessDateEst, getBusinessMonthEst } from "@/lib/timezone";
import { recordAuditLog } from "@/lib/audit";
import { emitActivityEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";

  const users = await prisma.user.findMany({
    where: {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { announcementName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ deletedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      role: true,
      status: true,
      deletedAt: true,
      announcementName: true,
      announcementTemplate: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const todayEst = getBusinessDateEst(now);
  const monthEst = getBusinessMonthEst(now);

  const [todayCounts, monthCounts, totalCounts] = await Promise.all([
    prisma.leadAnnouncement.groupBy({
      by: ["userId"],
      where: { businessDateEst: todayEst },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["userId"],
      where: { businessMonthEst: monthEst },
      _count: { id: true },
    }),
    prisma.leadAnnouncement.groupBy({
      by: ["userId"],
      _count: { id: true },
    }),
  ]);

  const todayMap = new Map(todayCounts.map((r) => [r.userId, r._count.id]));
  const monthMap = new Map(monthCounts.map((r) => [r.userId, r._count.id]));
  const totalMap = new Map(totalCounts.map((r) => [r.userId, r._count.id]));

  return NextResponse.json({
    callers: users.map((u) => ({
      ...u,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      leadsToday: todayMap.get(u.id) ?? 0,
      leadsThisMonth: monthMap.get(u.id) ?? 0,
      leadsAllTime: totalMap.get(u.id) ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createCallerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid caller data" },
      { status: 400 }
    );
  }

  const fullName = sanitizeSingleLineText(parsed.data.fullName);
  const username = parsed.data.username.trim().toLowerCase();
  const email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;
  const announcementName = sanitizeSingleLineText(
    parsed.data.announcementName || fullName.split(" ")[0] || fullName
  );

  try {
    const created = await prisma.user.create({
      data: {
        fullName,
        username,
        email,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
        status: "ACTIVE",
        announcementName,
        announcementTemplate: DEFAULT_ANNOUNCEMENT_TEMPLATE,
      },
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

    const ip = await getRequestIp();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CALLER_CREATED",
      targetType: "User",
      targetId: created.id,
      details: { username: created.username, role: created.role },
      ipAddress: ip,
    });

    await emitActivityEvent("CALLER_CHANGED", {
      action: "CREATED",
      userId: created.id,
    });

    return NextResponse.json(
      {
        caller: {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Username or email is already in use." },
        { status: 409 }
      );
    }
    console.error("Create caller failed:", err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
