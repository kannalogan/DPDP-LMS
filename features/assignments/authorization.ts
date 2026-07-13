import "server-only";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
export async function resolveAssignmentContext(mode: "student" | "mentor" | "admin") {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  const allowed =
    mode === "student"
      ? await can(identity.organizationId, "organization.read")
      : mode === "mentor"
        ? (await can(identity.organizationId, "assignment.grade.manage")) ||
          (await can(identity.organizationId, "mentor.workspace.manage")) ||
          (await can(identity.organizationId, "admin.workspace.manage"))
        : (await can(identity.organizationId, "assignment.authoring.manage")) ||
          (await can(identity.organizationId, "admin.workspace.manage"));
  return allowed ? identity : null;
}
