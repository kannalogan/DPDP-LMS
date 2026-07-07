import "server-only";
import { cache } from "react";
import { resolveAuthoringContext } from "@/features/course-authoring/authorization";
import { SupabaseAuthoringRepository } from "@/features/course-authoring/repositories/supabase-authoring-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const authoringContext = cache(resolveAuthoringContext);

async function repository() {
  const identity = await authoringContext();
  if (!identity?.organizationId) return null;
  return new SupabaseAuthoringRepository(
    await createSupabaseServerClient(),
    identity.organizationId
  );
}

export async function canAccessAuthoringWorkspace() {
  return Boolean(await authoringContext());
}

export async function getAuthoringWorkspace() {
  return (await repository())?.getWorkspace() ?? null;
}

export async function getAuthoringCourse(draftId: string) {
  return (await repository())?.getCourse(draftId) ?? null;
}
