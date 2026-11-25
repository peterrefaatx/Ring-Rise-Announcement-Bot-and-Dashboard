import { execSync } from "node:child_process";

function run(cmd, env = process.env) {
  execSync(cmd, { stdio: "inherit", env });
}

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

const buildEnv = {
  ...process.env,
  ...(dbUrl && !process.env.DATABASE_URL ? { DATABASE_URL: dbUrl } : {}),
};

console.log("[vercel-build] Generating Prisma Client...");
run("npx prisma generate", buildEnv);

if (dbUrl) {
  console.log("[vercel-build] Database URL detected — running migrations and seed...");
  run("npx prisma migrate deploy", buildEnv);
  run("npx tsx prisma/seed.ts", buildEnv);
} else {
  console.log("[vercel-build] No DATABASE_URL configured yet — skipping migrate/seed.");
}

console.log("[vercel-build] Building Next.js application...");
run("npx next build", buildEnv);
