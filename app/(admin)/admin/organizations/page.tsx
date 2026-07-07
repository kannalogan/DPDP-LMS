import {
  AdminPageHeader,
  AdminPermissionDenied,
  OrganizationTable
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminOrganizationsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  return (
    <>
      <AdminPageHeader
        description="Review accessible organizations, status, membership and pending operational work."
        title="Organizations"
      />
      <OrganizationTable organizations={data?.organizations ?? []} />
    </>
  );
}
