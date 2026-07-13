import "server-only";
import { can } from "@/features/rbac/server";
export async function canManageReporting(organizationId: string) {
  return can(organizationId, "admin.workspace.manage");
}
export async function canReadReporting(organizationId: string) {
  return can(organizationId, "organization.read");
}
