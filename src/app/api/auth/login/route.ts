import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession, getRequestIp, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const ip = await getRequestIp();
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid credentials payload" },
      { status: 400 }
    );
  }

  const normalizedUsername = parsed.data.username.trim().toLowerCase();
  const rateKey = `login:${ip}:${normalizedUsername}`;
  const rate = checkRateLimit(rateKey, 15, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user || user.deletedAt !== null || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact an administrator." },
        { status: 403 }
      );
    }

    clearRateLimit(rateKey);

    const userAgent = request.headers.get("user-agent");
    const { rawToken, expiresAt } = await createSession(user.id, userAgent, ip);

    await recordAuditLog({
      actorUserId: user.id,
      action: "USER_LOGIN",
      targetType: "User",
      targetId: user.id,
      ipAddress: ip,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        announcementName: user.announcementName,
        announcementTemplate: user.announcementTemplate,
      },
    });

    await setSessionCookie(response, rawToken, expiresAt);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    const msg =
      err instanceof Error && err.message.includes("AUTH_SECRET")
        ? err.message
        : "Server database or configuration error. Check DATABASE_URL and AUTH_SECRET.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
