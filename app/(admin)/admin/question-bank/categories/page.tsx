import {
  CategoryManager,
  QuestionBankHeader,
  QuestionPermissionDenied,
  QuestionTree
} from "@/features/question-authoring/components";
import { canAccessQuestionAuthoring } from "@/features/question-authoring/server";

export default async function QuestionCategoriesPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Organize question categories for search, review, import and template building."
        title="Categories"
      />
      <div className="question-authoring-grid">
        <CategoryManager />
        <QuestionTree />
      </div>
    </>
  );
}
