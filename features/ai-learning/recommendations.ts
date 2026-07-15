import type { AiLearningRecommendationDto } from "@/features/ai-learning/dtos";
export function rankLearningRecommendations(items: readonly AiLearningRecommendationDto[]) {
  return [...items].sort(
    (left, right) =>
      left.priority - right.priority ||
      (right.confidence ?? 0) - (left.confidence ?? 0) ||
      right.createdAt.localeCompare(left.createdAt)
  );
}
export function isLearningRecommendationActive(
  status: string,
  expiresAt: string | null,
  now = new Date()
) {
  return status === "active" && (!expiresAt || new Date(expiresAt) > now);
}
