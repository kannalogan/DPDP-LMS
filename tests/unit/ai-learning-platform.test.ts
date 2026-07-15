import { describe, expect, it } from "vitest";
import { scheduleFlashcardReview, shuffleFlashcards } from "@/features/ai-learning/flashcards";
import { calculateQuizScore, retryIncorrectQuestionIds } from "@/features/ai-learning/quiz";
import {
  isLearningRecommendationActive,
  rankLearningRecommendations
} from "@/features/ai-learning/recommendations";
import {
  aiLearningChatSchema,
  aiLearningGenerationSchema,
  flashcardOutputSchema,
  quizOutputSchema
} from "@/features/ai-learning/schemas";
import { canTransitionLearningSession, nextPlanStepStatus } from "@/features/ai-learning/workflow";
const uuid = "11111111-1111-4111-8111-111111111111";
describe("AI learning platform", () => {
  it("validates bounded chat requests", () => {
    expect(
      aiLearningChatSchema.safeParse({
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        message: "Explain consent",
        sessionId: uuid
      }).success
    ).toBe(true);
    expect(
      aiLearningChatSchema.safeParse({ idempotencyKey: "short", message: "", sessionId: "bad" })
        .success
    ).toBe(false);
  });
  it("validates source-grounded generation requests", () => {
    expect(
      aiLearningGenerationSchema.safeParse({
        count: 12,
        difficulty: "adaptive",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        kind: "quiz",
        prompt: "Quiz me",
        sessionId: uuid,
        sourceId: uuid,
        sourceType: "lesson"
      }).success
    ).toBe(true);
  });
  it("rejects malformed generated study artifacts", () => {
    expect(flashcardOutputSchema.safeParse({ cards: [], title: "Set" }).success).toBe(false);
    expect(
      quizOutputSchema.safeParse({
        questions: [
          {
            answer: "A",
            difficulty: "adaptive",
            explanation: "Because",
            options: [],
            prompt: "Question",
            questionType: "unknown"
          }
        ],
        title: "Quiz"
      }).success
    ).toBe(false);
  });
  it("applies deterministic spaced repetition", () => {
    expect(
      scheduleFlashcardReview(2, { easeFactor: 2.5, intervalDays: 6, reviewCount: 2 })
    ).toMatchObject({ intervalDays: 1, learningState: "difficult" });
    expect(
      scheduleFlashcardReview(5, { easeFactor: 2.5, intervalDays: 6, reviewCount: 2 }).learningState
    ).toBe("known");
  });
  it("shuffles without mutating input", () => {
    const input = [1, 2, 3];
    expect(shuffleFlashcards(input, () => 0)).toEqual([2, 3, 1]);
    expect(input).toEqual([1, 2, 3]);
  });
  it("scores quizzes and isolates incorrect retries", () => {
    expect(calculateQuizScore(3, 4)).toBe(75);
    expect(calculateQuizScore(1, 0)).toBe(0);
    expect(retryIncorrectQuestionIds(["a", "b"], new Set(["a"]))).toEqual(["b"]);
  });
  it("ranks and expires recommendations deterministically", () => {
    const base = {
      confidence: 0.7,
      createdAt: "2026-01-01",
      id: "a",
      priority: 20,
      reason: "Reason",
      recommendationType: "revision",
      status: "active",
      targetId: null,
      targetType: "course",
      title: "A"
    };
    expect(
      rankLearningRecommendations([{ ...base }, { ...base, id: "b", priority: 10 }])[0]?.id
    ).toBe("b");
    expect(isLearningRecommendationActive("active", "2025-01-01", new Date("2026-01-01"))).toBe(
      false
    );
  });
  it("enforces conversation and plan transitions", () => {
    expect(canTransitionLearningSession("open", "closed")).toBe(true);
    expect(canTransitionLearningSession("archived", "closed")).toBe(false);
    expect(nextPlanStepStatus("pending", false)).toBe("in_progress");
    expect(nextPlanStepStatus("in_progress", true)).toBe("completed");
  });
});
