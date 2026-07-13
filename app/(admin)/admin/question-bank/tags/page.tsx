import {
  QuestionBankHeader,
  QuestionPermissionDenied,
  TagManager
} from "@/features/question-authoring/components";
import { canAccessQuestionAuthoring } from "@/features/question-authoring/server";

export default async function QuestionTagsPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Manage taxonomy tags for reusable questions, outcomes, search and collection rules."
        title="Tags"
      />
      <TagManager />
    </>
  );
}
