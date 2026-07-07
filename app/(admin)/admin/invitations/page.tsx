import {
  AdminPageHeader,
  AdminPermissionDenied,
  InvitationDialog,
  InvitationTable
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminInvitationsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  return (
    <>
      <AdminPageHeader
        description="Create and revoke expiring organization invitations through controlled RPCs."
        title="Invitations"
      />
      <InvitationDialog />
      <InvitationTable invitations={data?.invitations ?? []} />
    </>
  );
}
