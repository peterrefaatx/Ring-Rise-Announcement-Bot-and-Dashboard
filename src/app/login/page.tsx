import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getPublicBrandSettings } from "@/lib/dashboard";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }
  const brand = await getPublicBrandSettings();
  return <LoginForm brand={brand} />;
}
