import "server-only";
import { can } from "@/features/rbac/server";
export const canReadSearch = (organizationId: string) => can(organizationId, "organization.read");
export async function canManageSearch(organizationId: string) {
  return (
    (await can(organizationId, "search.manage")) ||
    (await can(organizationId, "admin.workspace.manage"))
  );
}
export async function canReadSearchAnalytics(organizationId: string) {
  return (
    (await can(organizationId, "search.analytics.read")) || (await canManageSearch(organizationId))
  );
}
