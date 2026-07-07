import {
  AdminPageHeader,
  AdminPermissionDenied,
  ConfirmationDialog,
  SecuritySettings
} from "@/features/admin/components";
import { canAccessAdminWorkspace } from "@/features/admin/server";

export default async function AdminSettingsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  return (
    <>
      <AdminPageHeader
        description="Organization settings with confirmation for high-risk administrative changes."
        title="Settings"
      />
      <SecuritySettings />
      <ConfirmationDialog />
    </>
  );
}
