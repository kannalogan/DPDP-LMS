import "server-only";
import { cache } from "react";
import {
  canManageGovernance,
  canReviewCompliance,
  canUsePrivacyWorkspace
} from "@/features/governance/permissions";
import { createGovernanceRepository } from "@/features/governance/service";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const context = cache(resolveIdentityContext);
export type GovernanceAccess = "governance" | "compliance" | "account";
async function repository(access: GovernanceAccess) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed =
    access === "governance"
      ? await canManageGovernance(identity.organizationId)
      : access === "compliance"
        ? await canReviewCompliance(identity.organizationId)
        : await canUsePrivacyWorkspace(identity.organizationId);
  return allowed
    ? createGovernanceRepository(
        await createSupabaseServerClient(),
        identity.organizationId,
        identity.profileId
      )
    : null;
}
export async function canAccessGovernance(access: GovernanceAccess = "governance") {
  return Boolean(await repository(access));
}
export async function getGovernanceWorkspace(access: GovernanceAccess = "governance") {
  return (await repository(access))?.getWorkspace(access === "account") ?? null;
}
export async function getGovernanceOrganizationId(access: GovernanceAccess = "governance") {
  const identity = await context();
  if (!identity?.organizationId || !(await repository(access))) return null;
  return identity.organizationId;
}
