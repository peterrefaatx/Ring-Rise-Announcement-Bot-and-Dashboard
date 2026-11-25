import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    undefined
  );
}

const globalForDb = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const datasourceUrl = getDatabaseUrl();

export const prisma =
  globalForDb.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

export const pgPool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: datasourceUrl,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = prisma;
  globalForDb.pgPool = pgPool;
}
