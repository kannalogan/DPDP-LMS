import "server-only";
import { cache } from "react";
import { canManageAi, canReadAiAudit, canUseAi } from "@/features/ai/permissions";
import { createAiRepository } from "@/features/ai/service";
import type { AiWorkspaceAccess } from "@/features/ai/types";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const context = cache(resolveIdentityContext);
async function repository(access: AiWorkspaceAccess) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed =
    access === "admin"
      ? await canManageAi(identity.organizationId)
      : await canUseAi(identity.organizationId);
  return allowed
    ? createAiRepository(
        await createSupabaseServerClient(),
        identity.organizationId,
        identity.profileId
      )
    : null;
}
export async function canAccessAi(access: AiWorkspaceAccess) {
  return Boolean(await repository(access));
}
export async function getAiWorkspace(access: AiWorkspaceAccess) {
  return (await repository(access))?.getWorkspace(access === "admin") ?? null;
}
export async function getAiOrganizationId(access: AiWorkspaceAccess) {
  const identity = await context();
  return identity?.organizationId && (await repository(access)) ? identity.organizationId : null;
}
export async function canAccessAiAudit() {
  const identity = await context();
  return Boolean(identity?.organizationId && (await canReadAiAudit(identity.organizationId)));
}
