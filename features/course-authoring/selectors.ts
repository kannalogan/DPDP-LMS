import type { AuthoringWorkflowState } from "@/features/course-authoring/types";

export function authoringStateTone(state: string) {
  if (state === "published" || state === "approved") return "success" as const;
  if (state === "review" || state === "scheduled") return "warning" as const;
  if (state === "archived" || state === "rejected") return "danger" as const;
  return "neutral" as const;
}

export function formatAuthoringDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

export function canEditDraft(state: AuthoringWorkflowState) {
  return state === "draft" || state === "rejected";
}

export function workflowSteps(): AuthoringWorkflowState[] {
  return ["draft", "review", "approved", "scheduled", "published", "archived"];
}
