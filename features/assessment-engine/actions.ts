"use server";

import { revalidatePath } from "next/cache";
import {
  answerCommandSchema,
  assessmentStartSchema,
  attemptCommandSchema,
  reviewCommandSchema
} from "@/features/assessment-engine/schemas";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

export type AssessmentActionResult = ActionResult & { attemptId?: string };

function invalid(result: {
  error: { flatten(): { fieldErrors: Record<string, string[]> } };
}): AssessmentActionResult {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false };
}

async function secure(action: string) {
  await enforceServerActionSecurity(action, 60);
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await can(identity.organizationId, "organization.read")))
    throw new Error("Assessment permission denied");
  return createSupabaseServerClient();
}

function refresh(assessmentId: string) {
  revalidatePath("/student/assessments");
  revalidatePath(`/student/assessments/${assessmentId}`);
  revalidatePath(`/student/assessments/${assessmentId}/attempt`);
  revalidatePath(`/student/assessments/${assessmentId}/review`);
}

export async function startAssessment(formData: FormData): Promise<AssessmentActionResult> {
  const parsed = assessmentStartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure("assessment-start");
    const { data, error } = await client.rpc("syra_start_assessment", {
      p_assignment_id: parsed.data.assignmentId,
      p_idempotency_key: parsed.data.idempotencyKey
    });
    if (error || !data) return { error: "Assessment could not be started.", success: false };
    refresh(parsed.data.assessmentId);
    return { attemptId: data as string, message: "Assessment started.", success: true };
  } catch {
    return { error: "Assessment could not be started.", success: false };
  }
}

export async function resumeAssessment(formData: FormData): Promise<AssessmentActionResult> {
  const parsed = attemptCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure("assessment-resume");
    const { error } = await client.rpc("syra_resume_assessment", {
      p_attempt_id: parsed.data.attemptId
    });
    if (error) return { error: "Assessment could not be resumed.", success: false };
    refresh(parsed.data.assessmentId);
    return { attemptId: parsed.data.attemptId, message: "Assessment resumed.", success: true };
  } catch {
    return { error: "Assessment could not be resumed.", success: false };
  }
}

export async function saveAnswer(formData: FormData): Promise<AssessmentActionResult> {
  const parsed = answerCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure("assessment-autosave");
    const { error } = await client.rpc("syra_save_assessment_response", {
      p_attempt_id: parsed.data.attemptId,
      p_attempt_item_id: parsed.data.attemptItemId,
      p_client_version: parsed.data.clientVersion,
      p_response: parsed.data.response
    });
    if (error) return { error: "Answer could not be saved.", success: false };
    refresh(parsed.data.assessmentId);
    return { message: "Saved", success: true };
  } catch {
    return { error: "Answer could not be saved.", success: false };
  }
}

export async function clearAnswer(formData: FormData): Promise<AssessmentActionResult> {
  const parsed = reviewCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure("assessment-answer-clear");
    const { error } = await client.rpc("syra_clear_assessment_response", {
      p_attempt_id: parsed.data.attemptId,
      p_attempt_item_id: parsed.data.attemptItemId
    });
    if (error) return { error: "Answer could not be cleared.", success: false };
    refresh(parsed.data.assessmentId);
    return { message: "Answer cleared.", success: true };
  } catch {
    return { error: "Answer could not be cleared.", success: false };
  }
}

async function setReview(formData: FormData, marked: boolean): Promise<AssessmentActionResult> {
  const parsed = reviewCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure(marked ? "assessment-review-mark" : "assessment-review-unmark");
    const { error } = await client.rpc("syra_mark_assessment_review", {
      p_attempt_id: parsed.data.attemptId,
      p_attempt_item_id: parsed.data.attemptItemId,
      p_marked: marked
    });
    if (error) return { error: "Review marker could not be updated.", success: false };
    refresh(parsed.data.assessmentId);
    return { message: marked ? "Marked for review." : "Review marker removed.", success: true };
  } catch {
    return { error: "Review marker could not be updated.", success: false };
  }
}

export async function markForReview(formData: FormData) {
  return setReview(formData, true);
}
export async function unmarkForReview(formData: FormData) {
  return setReview(formData, false);
}

async function attemptLifecycle(
  formData: FormData,
  rpc: "syra_submit_assessment" | "syra_abandon_assessment",
  message: string
): Promise<AssessmentActionResult> {
  const parsed = attemptCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure(rpc);
    const { error } = await client.rpc(rpc, { p_attempt_id: parsed.data.attemptId });
    if (error) return { error: "Attempt state could not be updated.", success: false };
    refresh(parsed.data.assessmentId);
    return { message, success: true };
  } catch {
    return { error: "Attempt state could not be updated.", success: false };
  }
}

export async function submitAssessment(formData: FormData) {
  return attemptLifecycle(formData, "syra_submit_assessment", "Assessment submitted.");
}
export async function abandonAssessment(formData: FormData) {
  return attemptLifecycle(formData, "syra_abandon_assessment", "Assessment abandoned.");
}
