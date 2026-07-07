import "server-only";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";

export async function resolveAdminContext() {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  const allowed =
    (await can(identity.organizationId, "admin.workspace.manage")) ||
    (await can(identity.organizationId, "organization.member.manage")) ||
    (await can(identity.organizationId, "organization.update"));
  return allowed ? identity : null;
}
