export const aiLearningSessionTypes = [
  "tutor",
  "explanation",
  "summary",
  "quiz",
  "flashcards",
  "study_plan",
  "revision",
  "recommendation"
] as const;
export type AiLearningSessionType = (typeof aiLearningSessionTypes)[number];
export type AiLearningAccess = "student" | "mentor" | "admin";
export type AiLearningRouteMode =
  | "dashboard"
  | "chat"
  | "history"
  | "flashcards"
  | "quizzes"
  | "plans"
  | "recommendations"
  | "settings"
  | "students"
  | "interventions"
  | "insights"
  | "analytics"
  | "prompts";
export type AiLearningDifficulty = "introductory" | "intermediate" | "advanced" | "adaptive";
export type AiLearningSourceType = "lesson" | "module" | "course" | "assignment" | "assessment";
export type AiLearningGenerationKind =
  | "explanation"
  | "summary"
  | "flashcards"
  | "quiz"
  | "learning_plan"
  | "revision_plan"
  | "recommendations"
  | "insights";
export type AiLearningRequestState = "idle" | "submitting" | "success" | "error";
