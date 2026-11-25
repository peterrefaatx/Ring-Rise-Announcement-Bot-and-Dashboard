import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { CallerDashboard } from "@/components/dashboard/caller-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const snapshot = await getDashboardSnapshot(session.user.id);

  return (
    <CallerDashboard
      initialSnapshot={snapshot}
      user={{
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        role: session.user.role,
        announcementName: session.user.announcementName,
        announcementTemplate: session.user.announcementTemplate,
      }}
    />
  );
}
