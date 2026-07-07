import "server-only";
import { cache } from "react";
import { SupabaseMentorRepository } from "@/features/mentor/repositories/supabase-mentor-repository";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mentorContext = cache(async () => {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  if (!(await can(identity.organizationId, "organization.read"))) return null;
  return identity;
});

async function repository() {
  const identity = await mentorContext();
  if (!identity?.organizationId) return null;
  return new SupabaseMentorRepository(await createSupabaseServerClient(), identity.organizationId);
}

export async function canAccessMentorWorkspace() {
  const repo = await repository();
  if (!repo) return false;
  const data = await repo.getWorkspace();
  return data.summary.activeCohorts > 0 || data.summary.assignedLearners > 0;
}

export async function getMentorWorkspace() {
  return (await repository())?.getWorkspace() ?? null;
}

export async function getMentorLearner(learnerId: string) {
  return (await repository())?.getLearner(learnerId) ?? null;
}

export async function getMentorCohort(cohortId: string) {
  return (await repository())?.getCohort(cohortId) ?? null;
}
