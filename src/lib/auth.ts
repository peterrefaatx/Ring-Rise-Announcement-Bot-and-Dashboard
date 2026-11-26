import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "./db";
import { generateSessionToken, hashSessionToken } from "./crypto";
import { cached, invalidateCacheKey } from "./cache";

export const SESSION_COOKIE_NAME = "rr_session";
const SESSION_TTL_DAYS = 14;

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  announcementName: string;
  announcementTemplate: string;
  tokenVersion: number;
  createdAt: Date;
}

export async function getRequestIp(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return hdrs.get("x-real-ip") || "unknown";
}

export async function shouldUseSecureCookie(): Promise<boolean> {
  if (process.env.FORCE_SECURE_COOKIES === "true") {
    return true;
  }
  if (process.env.FORCE_SECURE_COOKIES === "false") {
    return false;
  }
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto");
  if (proto) {
    return proto.split(",")[0]?.trim() === "https";
  }
  return false;
}

export async function createSession(
  userId: string,
  userAgent?: string | null,
  ipAddress?: string | null,
  rememberMe = true
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const ttlDays = rememberMe ? 30 : 1;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent ? userAgent.slice(0, 300) : null,
      ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
    },
  });

  return { rawToken, expiresAt };
}

export async function setSessionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date,
  rememberMe = true
): Promise<void> {
  const secure = await shouldUseSecureCookie();
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    ...(rememberMe ? { expires: expiresAt } : {}),
  });
}

export async function clearSessionCookie(response: NextResponse): Promise<void> {
  const secure = await shouldUseSecureCookie();
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentSession(): Promise<{
  sessionId: string;
  user: AuthenticatedUser;
} | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) {
      return null;
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = await cached(`session:${tokenHash}`, 15000, async () => {
      return prisma.session.findUnique({
        where: { tokenHash },
        include: {
          user: {
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
              tokenVersion: true,
              createdAt: true,
            },
          },
        },
      });
    });

    if (!session) {
      invalidateCacheKey(`session:${tokenHash}`);
      return null;
    }

    if (session.expiresAt <= new Date()) {
      invalidateCacheKey(`session:${tokenHash}`);
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    if (session.user.deletedAt !== null || session.user.status !== "ACTIVE") {
      invalidateCacheKey(`session:${tokenHash}`);
      return null;
    }

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        announcementName: session.user.announcementName,
        announcementTemplate: session.user.announcementTemplate,
        tokenVersion: session.user.tokenVersion,
        createdAt: session.user.createdAt,
      },
    };
  } catch (err) {
    console.error("getCurrentSession failed:", err);
    return null;
  }
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  invalidateCacheKey(`session:${tokenHash}`);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function requireApiAuth(requiredRole?: UserRole): Promise<
  | { ok: true; sessionId: string; user: AuthenticatedUser }
  | { ok: false; response: NextResponse }
> {
  const auth = await getCurrentSession();
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required or session expired." },
        { status: 401 }
      ),
    };
  }

  if (requiredRole && auth.user.role !== requiredRole) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: insufficient permissions." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, sessionId: auth.sessionId, user: auth.user };
}
