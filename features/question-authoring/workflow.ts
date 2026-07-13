import type { QuestionWorkflowState, QuestionType } from "@/features/question-authoring/types";

const transitions: Record<QuestionWorkflowState, QuestionWorkflowState[]> = {
  approved: ["scheduled", "published"],
  archived: [],
  draft: ["review"],
  published: ["archived"],
  rejected: ["draft", "review"],
  review: ["approved", "rejected"],
  scheduled: ["published", "archived"]
};

export const questionTypes: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
  "file_upload",
  "coding",
  "scenario",
  "case_study",
  "practical_lab_reference"
];

export function canTransitionQuestion(from: QuestionWorkflowState, to: QuestionWorkflowState) {
  return transitions[from]?.includes(to) ?? false;
}

export function validateQuestionReady(input: { promptText: string; type: QuestionType }) {
  return {
    ready: Boolean(input.promptText.trim()) && questionTypes.includes(input.type),
    rules: [
      { ok: Boolean(input.promptText.trim()), title: "Prompt content is present" },
      { ok: questionTypes.includes(input.type), title: "Question type is supported" }
    ]
  };
}

export function validateImportPayload(input: { rows: number; sourceType: string }) {
  return {
    ready: input.rows >= 0 && ["csv", "json", "question_package"].includes(input.sourceType),
    rows: input.rows
  };
}
