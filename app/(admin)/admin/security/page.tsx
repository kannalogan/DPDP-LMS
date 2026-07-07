import {
  AdminPageHeader,
  AdminPermissionDenied,
  SecuritySettings
} from "@/features/admin/components";
import { canAccessAdminWorkspace } from "@/features/admin/server";

export default async function AdminSecurityPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  return (
    <>
      <AdminPageHeader
        description="Manage organization security posture and access controls."
        title="Security"
      />
      <SecuritySettings />
    </>
  );
}
