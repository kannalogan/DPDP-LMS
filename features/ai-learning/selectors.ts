import type { AiLearningWorkspaceDto } from "@/features/ai-learning/dtos";
export function selectPinnedLearningSessions(data: AiLearningWorkspaceDto) {
  return data.sessions.filter((session) => session.isPinned);
}
export function selectActiveLearningPlans(data: AiLearningWorkspaceDto) {
  return data.plans.filter((plan) => plan.status === "active");
}
export function selectDueFlashcardSets(data: AiLearningWorkspaceDto) {
  return data.flashcardSets.filter((set) => set.dueCount > 0);
}
export function selectAtRiskLearners(data: AiLearningWorkspaceDto, threshold = 0.65) {
  return data.mentorInsights.filter((insight) => insight.highestRisk >= threshold);
}
