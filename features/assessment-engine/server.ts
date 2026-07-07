import "server-only";
import { cache } from "react";
import { SupabaseAssessmentRepository } from "@/features/assessment-engine/repositories/supabase-assessment-repository";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const assessmentContext = cache(async () => {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  return (await can(identity.organizationId, "organization.read")) ? identity : null;
});

async function repository() {
  const identity = await assessmentContext();
  if (!identity?.organizationId) return null;
  return new SupabaseAssessmentRepository(
    await createSupabaseServerClient(),
    identity.profileId,
    identity.organizationId
  );
}

export async function canAccessAssessments() {
  return Boolean(await assessmentContext());
}
export async function getAssessmentCatalog() {
  return (await repository())?.getAssessmentCatalog() ?? [];
}
export async function getAssessmentDetails(assessmentId: string) {
  return (await repository())?.getAssessmentDetails(assessmentId) ?? null;
}
export async function getAssessmentQuestions(attemptId: string) {
  return (await repository())?.getAssessmentQuestions(attemptId) ?? [];
}
export async function getCurrentAttempt(assessmentId: string) {
  return (await repository())?.getCurrentAttempt(assessmentId) ?? null;
}
export async function getAttemptHistory(assessmentId: string) {
  return (await getAssessmentDetails(assessmentId))?.attempts ?? [];
}
export async function getAssessmentResultSummary(attemptId: string) {
  return (await repository())?.getAssessmentResultSummary(attemptId) ?? null;
}
