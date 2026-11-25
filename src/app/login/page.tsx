import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getDatabaseUrl, prisma } from "@/lib/db";
import { getPublicBrandSettings } from "@/lib/dashboard";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

async function checkSetupIssue(): Promise<string | null> {
  if (!getDatabaseUrl()) {
    return "Database is not configured. Add DATABASE_URL and AUTH_SECRET in your environment variables, then run database migrations and seed.";
  }
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      return "Database is connected but no accounts are seeded yet. Run `npx prisma migrate deploy` and `npx tsx prisma/seed.ts`.";
    }
    return null;
  } catch (err) {
    console.error("Database readiness check failed:", err);
    return "Database connection or schema migration is incomplete. Verify DATABASE_URL and run `npx prisma migrate deploy` and `npx tsx prisma/seed.ts`.";
  }
}

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }
  const [brand, setupWarning] = await Promise.all([
    getPublicBrandSettings(),
    checkSetupIssue(),
  ]);
  return <LoginForm brand={brand} setupWarning={setupWarning} />;
}
