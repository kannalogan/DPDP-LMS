import {
  AdminPageHeader,
  AdminPermissionDenied,
  BrandingEditor
} from "@/features/admin/components";
import { canAccessAdminWorkspace } from "@/features/admin/server";

export default async function AdminBrandingPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  return (
    <>
      <AdminPageHeader
        description="Manage organization display identity and approved branding metadata."
        title="Branding"
      />
      <BrandingEditor />
    </>
  );
}
