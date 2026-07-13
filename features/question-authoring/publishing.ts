import type { QuestionAuthoringItem } from "@/features/question-authoring/types";
import { validateQuestionReady } from "@/features/question-authoring/workflow";

export function getQuestionPublishReadiness(question: QuestionAuthoringItem | null) {
  if (!question) {
    return {
      ready: false,
      rules: [
        { ok: false, title: "Question draft is selected" },
        { ok: false, title: "Question type is supported" }
      ]
    };
  }
  return validateQuestionReady({ promptText: question.type, type: question.type });
}

export function canPublishQuestion(question: QuestionAuthoringItem | null) {
  return Boolean(question && ["approved", "scheduled"].includes(question.workflowState));
}
