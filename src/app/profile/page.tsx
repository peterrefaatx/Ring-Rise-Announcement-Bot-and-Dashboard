import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getPublicBrandSettings } from "@/lib/dashboard";
import { getCallerHistoryAnalytics } from "@/lib/analytics";
import { getBusinessDateEst } from "@/lib/timezone";
import { ProfileClient } from "@/components/profile/profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const [brand, history] = await Promise.all([
    getPublicBrandSettings(),
    getCallerHistoryAnalytics(session.user.id),
  ]);

  if (!history) {
    redirect("/login");
  }

  return (
    <ProfileClient
      user={{
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        announcementName: session.user.announcementName,
        announcementTemplate: session.user.announcementTemplate,
      }}
      brand={brand}
      businessDateEst={getBusinessDateEst(new Date())}
      history={history}
    />
  );
}
