import type {
  AiFlashcardDto,
  AiFlashcardSetDto,
  AiLearningAnalyticsDto,
  AiLearningDashboardDto,
  AiLearningMessageDto,
  AiLearningPlanDto,
  AiLearningPlanStepDto,
  AiLearningPreferencesDto,
  AiLearningRecommendationDto,
  AiLearningSessionDto,
  AiMentorStudentInsightDto,
  AiQuizDto,
  AiQuizQuestionDto
} from "@/features/ai-learning/dtos";
import type { AiLearningDifficulty, AiLearningSessionType } from "@/features/ai-learning/types";

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const list = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const encryptedUnavailable = "Encrypted content unavailable";
export type AiLearningDecrypt = (value: string) => Promise<string>;
async function decrypt(value: unknown, decryptContent: AiLearningDecrypt) {
  if (typeof value !== "string" || !value) return encryptedUnavailable;
  try {
    return await decryptContent(value);
  } catch {
    return encryptedUnavailable;
  }
}
export async function mapAiLearningSession(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiLearningSessionDto> {
  return {
    conversationId: text(row.conversation_id),
    expiresAt: text(row.expires_at),
    id: text(row.id),
    isPinned: row.is_pinned === true,
    lastActiveAt: text(row.last_active_at),
    sessionType: text(row.session_type, "tutor") as AiLearningSessionType,
    startedAt: text(row.started_at),
    status: text(row.status, "open") as AiLearningSessionDto["status"],
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export async function mapAiLearningMessage(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiLearningMessageDto> {
  return {
    content: await decrypt(row.content_ciphertext, decryptContent),
    createdAt: text(row.created_at),
    id: text(row.id),
    role: text(row.role) === "assistant" ? "assistant" : "user",
    sequenceNo: number(row.sequence_no)
  };
}
export async function mapAiFlashcardSet(
  row: Record<string, unknown>,
  counts: { cardCount: number; difficultCount: number; dueCount: number; knownCount: number },
  decryptContent: AiLearningDecrypt
): Promise<AiFlashcardSetDto> {
  return {
    ...counts,
    createdAt: text(row.created_at),
    difficulty: text(row.difficulty, "adaptive") as AiLearningDifficulty,
    id: text(row.id),
    status: text(row.status),
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export async function mapAiFlashcard(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiFlashcardDto> {
  return {
    back: await decrypt(row.back_ciphertext, decryptContent),
    category: text(row.category),
    difficulty: text(row.difficulty, "adaptive") as AiLearningDifficulty,
    explanation: row.explanation_ciphertext
      ? await decrypt(row.explanation_ciphertext, decryptContent)
      : null,
    front: await decrypt(row.front_ciphertext, decryptContent),
    id: text(row.id),
    learningState: text(row.learning_state),
    nextReviewAt: nullableText(row.next_review_at),
    sequenceNo: number(row.sequence_no)
  };
}
export async function mapAiQuiz(
  row: Record<string, unknown>,
  attempts: Array<Record<string, unknown>>,
  decryptContent: AiLearningDecrypt
): Promise<AiQuizDto> {
  const scores = attempts.map((attempt) => number(attempt.score_percent));
  return {
    attemptCount: attempts.length,
    bestScore: scores.length ? Math.max(...scores) : null,
    createdAt: text(row.created_at),
    difficulty: text(row.difficulty, "adaptive") as AiLearningDifficulty,
    id: text(row.id),
    questionCount: number(row.question_count),
    questionTypes: list(row.question_types),
    status: text(row.status),
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export async function mapAiQuizQuestion(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiQuizQuestionDto> {
  let options: string[] = [];
  if (row.options_ciphertext) {
    try {
      const parsed: unknown = JSON.parse(await decrypt(row.options_ciphertext, decryptContent));
      options = list(parsed);
    } catch {
      options = [];
    }
  }
  return {
    answer: await decrypt(row.answer_ciphertext, decryptContent),
    difficulty: text(row.difficulty, "adaptive") as AiLearningDifficulty,
    explanation: await decrypt(row.explanation_ciphertext, decryptContent),
    id: text(row.id),
    options,
    prompt: await decrypt(row.prompt_ciphertext, decryptContent),
    questionType: text(row.question_type),
    sequenceNo: number(row.sequence_no)
  };
}
export async function mapAiLearningPlanStep(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiLearningPlanStepDto> {
  return {
    description: await decrypt(row.description_ciphertext, decryptContent),
    estimatedMinutes: number(row.estimated_minutes),
    id: text(row.id),
    priority: number(row.priority),
    scheduledFor: nullableText(row.scheduled_for),
    sequenceNo: number(row.sequence_no),
    status: text(row.status),
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export async function mapAiLearningPlan(
  row: Record<string, unknown>,
  steps: AiLearningPlanStepDto[],
  decryptContent: AiLearningDecrypt
): Promise<AiLearningPlanDto> {
  return {
    endsOn: nullableText(row.ends_on),
    id: text(row.id),
    overview: await decrypt(row.overview_ciphertext, decryptContent),
    planType: text(row.plan_type),
    startsOn: nullableText(row.starts_on),
    status: text(row.status),
    steps,
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export async function mapAiLearningRecommendation(
  row: Record<string, unknown>,
  decryptContent: AiLearningDecrypt
): Promise<AiLearningRecommendationDto> {
  return {
    confidence: row.confidence === null ? null : number(row.confidence),
    createdAt: text(row.created_at),
    id: text(row.id),
    priority: number(row.priority),
    reason: await decrypt(row.reason_ciphertext, decryptContent),
    recommendationType: text(row.recommendation_type),
    status: text(row.status),
    targetId: nullableText(row.target_id),
    targetType: text(row.target_type),
    title: await decrypt(row.title_ciphertext, decryptContent)
  };
}
export function mapAiLearningDashboard(row?: Record<string, unknown>): AiLearningDashboardDto {
  return {
    activeGoals: number(row?.active_goals),
    activePlans: number(row?.active_plans),
    activeRecommendations: number(row?.active_recommendations),
    cardsDue: number(row?.cards_due),
    lastActiveAt: nullableText(row?.last_active_at),
    openSessions: number(row?.open_sessions),
    pinnedSessions: number(row?.pinned_sessions)
  };
}
export function mapAiLearningPreferences(row: Record<string, unknown>): AiLearningPreferencesDto {
  return {
    allowLearningMemory: row.allow_learning_memory === true,
    explanationDepth: text(row.explanation_depth),
    flashcardBatchSize: number(row.flashcard_batch_size),
    learningStyle: text(row.learning_style),
    preferredDifficulty: text(row.preferred_difficulty, "adaptive") as AiLearningDifficulty,
    quizQuestionTypes: list(row.quiz_question_types),
    sessionMinutes: number(row.session_minutes)
  };
}
export function mapAiMentorStudentInsight(row: Record<string, unknown>): AiMentorStudentInsightDto {
  return {
    activeRecommendations: number(row.active_recommendations),
    highestRisk: number(row.highest_risk),
    lastActiveAt: nullableText(row.last_active_at),
    openWeaknesses: number(row.open_weaknesses),
    profileId: text(row.profile_id),
    sessionCount: number(row.session_count)
  };
}
export function mapAiLearningAnalytics(row: Record<string, unknown>): AiLearningAnalyticsDto {
  return {
    activityDay: text(row.activity_day),
    eventCount: number(row.event_count),
    eventType: text(row.event_type),
    learnerCount: number(row.learner_count),
    sessionCount: number(row.session_count)
  };
}
