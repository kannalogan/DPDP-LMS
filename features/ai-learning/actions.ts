"use server";
import { revalidatePath } from "next/cache";
import {
  aiLearningFeedbackSchema,
  aiLearningPreferencesSchema,
  createLearningSessionSchema
} from "@/features/ai-learning/schemas";
import { startAiLearningSession } from "@/features/ai-learning/server";
import { encryptAiLearningContent, hashAiLearningContent } from "@/features/ai-learning/crypto";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

const refresh = () => {
  for (const path of [
    "/student/assistant",
    "/student/assistant/chat",
    "/student/assistant/history",
    "/student/assistant/flashcards",
    "/student/assistant/quizzes",
    "/student/assistant/plans",
    "/student/assistant/recommendations",
    "/student/assistant/settings",
    "/mentor/ai/students",
    "/mentor/ai/interventions",
    "/mentor/ai/insights",
    "/admin/ai/learning",
    "/admin/ai/learning/analytics"
  ])
    revalidatePath(path);
};
const invalid = (error: { flatten(): { fieldErrors: Record<string, string[]> } }) =>
  ({ fieldErrors: error.flatten().fieldErrors, success: false }) satisfies ActionResult;
async function secureClient(action: string, limit = 20) {
  await enforceServerActionSecurity(action, limit);
  return createSupabaseServerClient();
}
export async function createAiLearningSession(formData: FormData): Promise<ActionResult> {
  const parsed = createLearningSessionSchema.safeParse({
    courseId: formData.get("courseId") || null,
    lessonId: formData.get("lessonId") || null,
    moduleId: formData.get("moduleId") || null,
    organizationId: formData.get("organizationId"),
    retentionDays: formData.get("retentionDays") || 30,
    sessionType: formData.get("sessionType"),
    title: formData.get("title")
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await enforceServerActionSecurity("ai-learning-session-create", 10);
    await startAiLearningSession(parsed.data);
    refresh();
    return { message: "Learning session created.", success: true };
  } catch {
    return { error: "Learning session could not be created.", success: false };
  }
}
export async function updateAiLearningPreferences(input: unknown): Promise<ActionResult> {
  const parsed = aiLearningPreferencesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await secureClient("ai-learning-preferences")
  ).rpc("update_learning_preferences", {
    p_allow_learning_memory: parsed.data.allowLearningMemory,
    p_content_formats: parsed.data.contentFormats,
    p_explanation_depth: parsed.data.explanationDepth,
    p_flashcard_batch_size: parsed.data.flashcardBatchSize,
    p_learning_style: parsed.data.learningStyle,
    p_organization_id: parsed.data.organizationId,
    p_preferred_difficulty: parsed.data.preferredDifficulty,
    p_quiz_question_types: parsed.data.quizQuestionTypes,
    p_session_minutes: parsed.data.sessionMinutes
  });
  if (error) return { error: "Learning preferences could not be saved.", success: false };
  refresh();
  return { message: "Learning preferences saved.", success: true };
}
export async function recordAiLearningFeedback(input: unknown): Promise<ActionResult> {
  const parsed = aiLearningFeedbackSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const commentCiphertext = parsed.data.comment
    ? await encryptAiLearningContent(parsed.data.comment)
    : null;
  const { error } = await (
    await secureClient("ai-learning-feedback", 30)
  ).rpc("record_learning_feedback", {
    p_comment_ciphertext: commentCiphertext,
    p_helpful: parsed.data.helpful,
    p_learning_session_id: parsed.data.sessionId,
    p_rating: parsed.data.rating,
    p_reason_codes: parsed.data.reasonCodes,
    p_subject_id: parsed.data.subjectId,
    p_subject_type: parsed.data.subjectType
  });
  if (error) return { error: "Feedback could not be recorded.", success: false };
  return { message: "Feedback recorded.", success: true };
}
export async function setAiLearningSessionState(input: {
  isPinned: boolean;
  sessionId: string;
  status: "open" | "closed" | "archived";
}): Promise<ActionResult> {
  const { error } = await (
    await secureClient("ai-learning-session-state")
  ).rpc("update_learning_session_state", {
    p_is_pinned: input.isPinned,
    p_learning_session_id: input.sessionId,
    p_status: input.status
  });
  if (error) return { error: "Session state could not be updated.", success: false };
  refresh();
  return { message: "Session state updated.", success: true };
}
export async function recordAiQuizAttempt(input: {
  correctCount: number;
  incorrectQuestionIds: string[];
  quizId: string;
  responses: Record<string, unknown>;
  scorePercent: number;
  startedAt: string;
}): Promise<ActionResult> {
  const response = JSON.stringify(input.responses);
  const { error } = await (
    await secureClient("ai-learning-quiz-attempt", 30)
  ).rpc("record_quiz_attempt", {
    p_correct_count: input.correctCount,
    p_incorrect_question_ids: input.incorrectQuestionIds,
    p_quiz_generation_id: input.quizId,
    p_response_ciphertext: await encryptAiLearningContent(response),
    p_response_hash: await hashAiLearningContent(response),
    p_score_percent: input.scorePercent,
    p_started_at: input.startedAt
  });
  if (error) return { error: "Quiz attempt could not be recorded.", success: false };
  refresh();
  return { message: "Quiz attempt recorded.", success: true };
}
