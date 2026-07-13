import "server-only";
import { cache } from "react";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageReporting, canReadReporting } from "@/features/reporting/permissions";
import { createReportingRepository } from "@/features/reporting/service";
const context = cache(resolveIdentityContext);
async function repository(requireAdmin = false) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed = requireAdmin
    ? await canManageReporting(identity.organizationId)
    : await canReadReporting(identity.organizationId);
  return allowed
    ? createReportingRepository(await createSupabaseServerClient(), identity.organizationId)
    : null;
}
export async function canAccessReporting(requireAdmin = false) {
  return Boolean(await repository(requireAdmin));
}
export async function getReportingWorkspace(requireAdmin = false) {
  return (await repository(requireAdmin))?.getWorkspace() ?? null;
}
export async function getReportingReport(id: string) {
  return (await repository(true))?.getReport(id) ?? null;
}
