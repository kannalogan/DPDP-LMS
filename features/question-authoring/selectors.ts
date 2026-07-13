import type { QuestionWorkflowState } from "@/features/question-authoring/types";

export function questionStateTone(state: string) {
  if (state === "published" || state === "approved") return "success" as const;
  if (state === "review" || state === "scheduled") return "warning" as const;
  if (state === "archived" || state === "rejected") return "danger" as const;
  return "neutral" as const;
}

export function questionWorkflowSteps(): QuestionWorkflowState[] {
  return ["draft", "review", "approved", "scheduled", "published", "archived"];
}

export function formatQuestionDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}
