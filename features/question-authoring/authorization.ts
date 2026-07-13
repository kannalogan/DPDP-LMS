import "server-only";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";

export async function resolveQuestionAuthoringContext() {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  const allowed =
    (await can(identity.organizationId, "question.authoring.manage")) ||
    (await can(identity.organizationId, "assessment.catalog.manage")) ||
    (await can(identity.organizationId, "admin.workspace.manage")) ||
    (await can(identity.organizationId, "mentor.workspace.manage"));
  return allowed ? identity : null;
}
