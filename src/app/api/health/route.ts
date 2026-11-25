import { NextResponse } from "next/server";
import { getDatabaseUrl, prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrlConfigured = Boolean(getDatabaseUrl());
  const authSecretConfigured = Boolean(
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
  );

  if (!dbUrlConfigured) {
    return NextResponse.json(
      {
        status: "error",
        databaseConfigured: false,
        authSecretConfigured,
        error: "DATABASE_URL (or POSTGRES_PRISMA_URL) is not configured.",
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      databaseConfigured: true,
      authSecretConfigured,
      usersSeeded: userCount > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database unavailable";
    console.error("Health check failed:", err);
    return NextResponse.json(
      {
        status: "error",
        databaseConfigured: true,
        authSecretConfigured,
        error: message,
      },
      { status: 503 }
    );
  }
}
