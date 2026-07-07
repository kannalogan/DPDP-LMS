import {
  AdminPageHeader,
  AdminPermissionDenied,
  OrganizationTable
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminUsersPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  return (
    <>
      <AdminPageHeader
        description="User administration is organization-scoped through membership and role policies."
        title="Users"
      />
      <OrganizationTable organizations={data?.organizations ?? []} />
    </>
  );
}
