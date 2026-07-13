import "server-only";
import { can } from "@/features/rbac/server";
export async function canManageAi(organizationId: string) {
  return (
    (await can(organizationId, "ai.platform.manage")) ||
    (await can(organizationId, "admin.workspace.manage"))
  );
}
export async function canUseAi(organizationId: string) {
  return (
    (await can(organizationId, "ai.platform.use")) ||
    (await can(organizationId, "organization.read"))
  );
}
export async function canReadAiAudit(organizationId: string) {
  return (await can(organizationId, "ai.audit.read")) || (await canManageAi(organizationId));
}
