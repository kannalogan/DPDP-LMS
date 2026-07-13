import "server-only";
import { can } from "@/features/rbac/server";

export async function canManageGovernance(organizationId: string) {
  return (
    (await can(organizationId, "governance.manage")) ||
    (await can(organizationId, "admin.workspace.manage"))
  );
}
export async function canReviewCompliance(organizationId: string) {
  return (
    (await can(organizationId, "compliance.review")) || (await canManageGovernance(organizationId))
  );
}
export async function canManagePrivacy(organizationId: string) {
  return (
    (await can(organizationId, "privacy.request.manage")) ||
    (await canManageGovernance(organizationId))
  );
}
export async function canUsePrivacyWorkspace(organizationId: string) {
  return can(organizationId, "organization.read");
}
