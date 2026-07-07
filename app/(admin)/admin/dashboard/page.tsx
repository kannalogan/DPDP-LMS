import {
  AdminDashboard,
  AdminPageHeader,
  AdminPermissionDenied
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminDashboardPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  if (!data) return <AdminPermissionDenied />;
  return (
    <>
      <AdminPageHeader
        description="Operational controls for organizations, users, domains, invitations, security and announcements."
        title="Dashboard"
      />
      <AdminDashboard data={data} />
    </>
  );
}
