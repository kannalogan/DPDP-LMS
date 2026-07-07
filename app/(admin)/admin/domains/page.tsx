import {
  AdminPageHeader,
  AdminPermissionDenied,
  DomainVerification
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminDomainsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  return (
    <>
      <AdminPageHeader
        description="Activate and verify organization-owned domains for tenant discovery."
        title="Domains"
      />
      <DomainVerification domains={data?.domains ?? []} />
    </>
  );
}
