import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { AdminPortal } from "@/components/admin/admin-portal";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const snapshot = await getDashboardSnapshot(session.user.id);

  return (
    <AdminPortal
      initialSnapshot={snapshot}
      user={{
        id: session.user.id,
        fullName: session.user.fullName,
        username: session.user.username,
        role: session.user.role,
        announcementName: session.user.announcementName,
      }}
    />
  );
}
