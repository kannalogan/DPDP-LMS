import { notFound } from "next/navigation";
import {
  AdminPageHeader,
  AdminPermissionDenied,
  AuditTimeline,
  OrganizationDetail
} from "@/features/admin/components";
import { adminOrganizationRouteSchema } from "@/features/admin/schemas";
import { canAccessAdminWorkspace, getAdminOrganization } from "@/features/admin/server";

export default async function AdminOrganizationDetailPage({
  params
}: {
  params: Promise<{ organizationId: string }>;
}) {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const parsed = adminOrganizationRouteSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const organization = await getAdminOrganization(parsed.data.organizationId);
  if (!organization) notFound();
  return (
    <>
      <AdminPageHeader
        description="Organization-scoped administration and immutable operational timeline."
        title={organization.name}
      />
      <OrganizationDetail organization={organization} />
      <AuditTimeline />
    </>
  );
}
