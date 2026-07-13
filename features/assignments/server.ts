import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAssignmentContext } from "@/features/assignments/authorization";
import { createAssignmentRepository } from "@/features/assignments/service";
async function repository(mode: "student" | "mentor" | "admin") {
  const identity = await resolveAssignmentContext(mode);
  if (!identity?.organizationId) return null;
  return createAssignmentRepository(
    await createSupabaseServerClient(),
    identity.organizationId,
    identity.profileId
  );
}
export async function canAccessAssignments(mode: "student" | "mentor" | "admin") {
  return Boolean(await repository(mode));
}
export async function getAssignmentWorkspace(mode: "student" | "mentor" | "admin") {
  return (await repository(mode))?.getWorkspace(mode) ?? null;
}
export async function getAssignmentDetail(mode: "student" | "mentor" | "admin", id: string) {
  return (await repository(mode))?.getAssignment(id) ?? null;
}
export async function getSubmissionReview(id: string) {
  return (await repository("mentor"))?.getSubmission(id) ?? null;
}
