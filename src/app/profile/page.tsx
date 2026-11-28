import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import {
  getDefaultAnnouncementTemplate,
  getPublicBrandSettings,
} from "@/lib/dashboard";
import { getCallerHistoryAnalytics } from "@/lib/analytics";
import { getBusinessDateEst } from "@/lib/timezone";
import { ProfileClient } from "@/components/profile/profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const [brand, defaultAnnouncementTemplate, history] = await Promise.all([
    getPublicBrandSettings(),
    getDefaultAnnouncementTemplate(),
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
      defaultAnnouncementTemplate={defaultAnnouncementTemplate}
      businessDateEst={getBusinessDateEst(new Date())}
      history={history}
    />
  );
}
