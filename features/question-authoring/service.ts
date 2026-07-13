import "server-only";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace,
  getQuestionDraft
} from "@/features/question-authoring/server";

export async function getQuestionBankDashboard() {
  if (!(await canAccessQuestionAuthoring())) return null;
  return getQuestionAuthoringWorkspace();
}

export async function getQuestionEditorState(questionDraftId: string) {
  if (!(await canAccessQuestionAuthoring())) return null;
  return getQuestionDraft(questionDraftId);
}
