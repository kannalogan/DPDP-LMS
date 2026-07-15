import type { AiLearningDifficulty, AiLearningSessionType } from "@/features/ai-learning/types";

export type AiLearningDashboardDto = {
  activeGoals: number;
  activePlans: number;
  activeRecommendations: number;
  cardsDue: number;
  lastActiveAt: string | null;
  openSessions: number;
  pinnedSessions: number;
};
export type AiLearningSessionDto = {
  conversationId: string;
  expiresAt: string;
  id: string;
  isPinned: boolean;
  lastActiveAt: string;
  sessionType: AiLearningSessionType;
  startedAt: string;
  status: "open" | "closed" | "archived";
  title: string;
};
export type AiLearningMessageDto = {
  content: string;
  createdAt: string;
  id: string;
  role: "assistant" | "user";
  sequenceNo: number;
};
export type AiFlashcardSetDto = {
  cardCount: number;
  createdAt: string;
  difficulty: AiLearningDifficulty;
  difficultCount: number;
  dueCount: number;
  id: string;
  knownCount: number;
  status: string;
  title: string;
};
export type AiFlashcardDto = {
  back: string;
  category: string;
  difficulty: AiLearningDifficulty;
  explanation: string | null;
  front: string;
  id: string;
  learningState: string;
  nextReviewAt: string | null;
  sequenceNo: number;
};
export type AiQuizDto = {
  attemptCount: number;
  bestScore: number | null;
  createdAt: string;
  difficulty: AiLearningDifficulty;
  id: string;
  questionCount: number;
  questionTypes: string[];
  status: string;
  title: string;
};
export type AiQuizQuestionDto = {
  answer: string;
  difficulty: AiLearningDifficulty;
  explanation: string;
  id: string;
  options: string[];
  prompt: string;
  questionType: string;
  sequenceNo: number;
};
export type AiLearningPlanStepDto = {
  description: string;
  estimatedMinutes: number;
  id: string;
  priority: number;
  scheduledFor: string | null;
  sequenceNo: number;
  status: string;
  title: string;
};
export type AiLearningPlanDto = {
  endsOn: string | null;
  id: string;
  overview: string;
  planType: string;
  startsOn: string | null;
  status: string;
  steps: AiLearningPlanStepDto[];
  title: string;
};
export type AiLearningRecommendationDto = {
  confidence: number | null;
  createdAt: string;
  id: string;
  priority: number;
  reason: string;
  recommendationType: string;
  status: string;
  targetId: string | null;
  targetType: string;
  title: string;
};
export type AiLearningPreferencesDto = {
  allowLearningMemory: boolean;
  explanationDepth: string;
  flashcardBatchSize: number;
  learningStyle: string;
  preferredDifficulty: AiLearningDifficulty;
  quizQuestionTypes: string[];
  sessionMinutes: number;
};
export type AiMentorStudentInsightDto = {
  activeRecommendations: number;
  highestRisk: number;
  lastActiveAt: string | null;
  openWeaknesses: number;
  profileId: string;
  sessionCount: number;
};
export type AiLearningAnalyticsDto = {
  activityDay: string;
  eventCount: number;
  eventType: string;
  learnerCount: number;
  sessionCount: number;
};
export type AiLearningWorkspaceDto = {
  analytics: AiLearningAnalyticsDto[];
  dashboard: AiLearningDashboardDto;
  flashcardSets: AiFlashcardSetDto[];
  mentorInsights: AiMentorStudentInsightDto[];
  plans: AiLearningPlanDto[];
  preferences: AiLearningPreferencesDto | null;
  quizzes: AiQuizDto[];
  recommendations: AiLearningRecommendationDto[];
  sessions: AiLearningSessionDto[];
};
