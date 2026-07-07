import type { AuthoringWorkflowState } from "@/features/course-authoring/types";

const transitions: Record<AuthoringWorkflowState, AuthoringWorkflowState[]> = {
  approved: ["scheduled", "published"],
  archived: [],
  draft: ["review"],
  published: ["archived"],
  rejected: ["draft", "review"],
  review: ["approved", "rejected"],
  scheduled: ["published", "archived"]
};

export function canTransition(from: AuthoringWorkflowState, to: AuthoringWorkflowState) {
  return transitions[from]?.includes(to) ?? false;
}

export function nextWorkflowStates(from: AuthoringWorkflowState) {
  return transitions[from] ?? [];
}

export function validatePublishDependencies(input: {
  lessonCount: number;
  moduleCount: number;
  title: string;
}) {
  return {
    ready: Boolean(input.title.trim()) && input.moduleCount > 0 && input.lessonCount > 0,
    rules: [
      { ok: Boolean(input.title.trim()), title: "Course title is present" },
      { ok: input.moduleCount > 0, title: "At least one module exists" },
      { ok: input.lessonCount > 0, title: "At least one lesson exists" }
    ]
  };
}
