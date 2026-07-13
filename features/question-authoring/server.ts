import "server-only";
import { cache } from "react";
import { resolveQuestionAuthoringContext } from "@/features/question-authoring/authorization";
import { SupabaseQuestionAuthoringRepository } from "@/features/question-authoring/repositories/supabase-question-authoring-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const questionAuthoringContext = cache(resolveQuestionAuthoringContext);

async function repository() {
  const identity = await questionAuthoringContext();
  if (!identity?.organizationId) return null;
  return new SupabaseQuestionAuthoringRepository(
    await createSupabaseServerClient(),
    identity.organizationId
  );
}

export async function canAccessQuestionAuthoring() {
  return Boolean(await questionAuthoringContext());
}

export async function getQuestionAuthoringWorkspace() {
  return (await repository())?.getWorkspace() ?? null;
}

export async function getQuestionDraft(questionDraftId: string) {
  return (await repository())?.getQuestion(questionDraftId) ?? null;
}
