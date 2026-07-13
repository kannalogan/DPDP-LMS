"use server";

import { revalidatePath } from "next/cache";
import {
  authoringEventSchema,
  collectionQuestionSchema,
  collectionSchema,
  createQuestionSchema,
  parseJsonValue,
  questionDecisionSchema,
  questionIdSchema,
  rejectQuestionSchema,
  reviewerSchema,
  saveQuestionSchema,
  saveTemplateSchema,
  templateSchema
} from "@/features/question-authoring/schemas";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

function invalid(result: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false } satisfies ActionResult;
}

async function client(action: string) {
  await enforceServerActionSecurity(action, 30);
  return createSupabaseServerClient();
}

function refresh() {
  for (const path of [
    "/admin/question-bank",
    "/admin/question-bank/import",
    "/admin/question-bank/categories",
    "/admin/question-bank/tags",
    "/admin/question-bank/collections",
    "/admin/question-bank/templates",
    "/admin/question-bank/reviews",
    "/admin/question-bank/publishing",
    "/mentor/question-bank"
  ]) {
    revalidatePath(path);
  }
}

export async function createQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = createQuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-create")
  ).rpc("create_question", {
    p_organization_id: parsed.data.organizationId,
    p_prompt: parseJsonValue(parsed.data.prompt),
    p_question_bank_id: parsed.data.questionBankId,
    p_type: parsed.data.type
  });
  if (error) return { error: "Question draft could not be created.", success: false };
  refresh();
  return { message: "Question draft created.", success: true };
}

export async function saveQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = saveQuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-save")
  ).rpc("save_question", {
    p_choices: parseJsonValue(parsed.data.choices),
    p_metadata: parseJsonValue(parsed.data.metadata),
    p_prompt: parseJsonValue(parsed.data.prompt),
    p_question_draft_id: parsed.data.questionDraftId
  });
  if (error) return { error: "Question draft could not be saved.", success: false };
  refresh();
  return { message: "Question draft saved.", success: true };
}

export async function publishQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = questionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-publish")
  ).rpc("publish_question", { p_question_draft_id: parsed.data.questionDraftId });
  if (error) return { error: "Question could not be published.", success: false };
  refresh();
  return { message: "Question published.", success: true };
}

export async function archiveQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = questionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-archive")
  ).rpc("archive_question", { p_question_draft_id: parsed.data.questionDraftId });
  if (error) return { error: "Question could not be archived.", success: false };
  refresh();
  return { message: "Question archived.", success: true };
}

export async function cloneQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = questionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-clone")
  ).rpc("clone_question", { p_question_draft_id: parsed.data.questionDraftId });
  if (error) return { error: "Question could not be cloned.", success: false };
  refresh();
  return { message: "Question cloned.", success: true };
}

export async function approveQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = questionDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-approve")
  ).rpc("approve_question", {
    p_notes: parsed.data.notes,
    p_question_draft_id: parsed.data.questionDraftId
  });
  if (error) return { error: "Question could not be approved.", success: false };
  refresh();
  return { message: "Question approved.", success: true };
}

export async function rejectQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = rejectQuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-reject")
  ).rpc("reject_question", {
    p_notes: parsed.data.notes,
    p_question_draft_id: parsed.data.questionDraftId
  });
  if (error) return { error: "Question could not be rejected.", success: false };
  refresh();
  return { message: "Question rejected.", success: true };
}

export async function createCollection(formData: FormData): Promise<ActionResult> {
  const parsed = collectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-collection-create")
  ).rpc("create_collection", {
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_question_bank_id: parsed.data.questionBankId
  });
  if (error) return { error: "Collection could not be created.", success: false };
  refresh();
  return { message: "Collection created.", success: true };
}

export async function addQuestionToCollection(formData: FormData): Promise<ActionResult> {
  const parsed = collectionQuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-collection-add")
  ).rpc("add_question_to_collection", {
    p_collection_id: parsed.data.collectionId,
    p_points: parsed.data.points,
    p_position: parsed.data.position,
    p_question_draft_id: parsed.data.questionDraftId
  });
  if (error) return { error: "Question could not be added.", success: false };
  refresh();
  return { message: "Question added to collection.", success: true };
}

export async function removeQuestionFromCollection(formData: FormData): Promise<ActionResult> {
  const parsed = collectionQuestionSchema
    .pick({ collectionId: true, questionDraftId: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-collection-remove")
  ).rpc("remove_question_from_collection", {
    p_collection_id: parsed.data.collectionId,
    p_question_draft_id: parsed.data.questionDraftId
  });
  if (error) return { error: "Question could not be removed.", success: false };
  refresh();
  return { message: "Question removed from collection.", success: true };
}

export async function createAssessmentTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("assessment-template-create")
  ).rpc("create_assessment_template", {
    p_blueprint_id: parsed.data.blueprintId ?? null,
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Assessment template could not be created.", success: false };
  refresh();
  return { message: "Assessment template created.", success: true };
}

export async function saveAssessmentTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = saveTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("assessment-template-save")
  ).rpc("save_assessment_template", {
    p_instructions: parseJsonValue(parsed.data.instructions),
    p_randomization_policy: parseJsonValue(parsed.data.randomizationPolicy),
    p_template_id: parsed.data.templateId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Assessment template could not be saved.", success: false };
  refresh();
  return { message: "Assessment template saved.", success: true };
}

export async function publishAssessmentTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = saveTemplateSchema
    .pick({ templateId: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("assessment-template-publish")
  ).rpc("publish_assessment_template", { p_template_id: parsed.data.templateId });
  if (error) return { error: "Assessment template could not be published.", success: false };
  refresh();
  return { message: "Assessment template published.", success: true };
}

export async function assignReviewer(formData: FormData): Promise<ActionResult> {
  const parsed = reviewerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-reviewer-assign")
  ).rpc("assign_reviewer", {
    p_organization_id: parsed.data.organizationId,
    p_reviewer_profile_id: parsed.data.reviewerProfileId,
    p_target_id: parsed.data.targetId,
    p_target_type: parsed.data.targetType
  });
  if (error) return { error: "Reviewer could not be assigned.", success: false };
  refresh();
  return { message: "Reviewer assigned.", success: true };
}

export async function recordAuthoringEvent(formData: FormData): Promise<ActionResult> {
  const parsed = authoringEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("question-authoring-event")
  ).rpc("record_authoring_event", {
    p_event_type: parsed.data.eventType,
    p_metadata: parseJsonValue(parsed.data.metadata),
    p_organization_id: parsed.data.organizationId,
    p_target_id: parsed.data.targetId,
    p_target_type: parsed.data.targetType
  });
  if (error) return { error: "Authoring event could not be recorded.", success: false };
  return { message: "Authoring event recorded.", success: true };
}
