import {
  CollectionManager,
  QuestionBankHeader,
  QuestionPermissionDenied,
  QuestionTable
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function QuestionCollectionsPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Build reusable question collections for assessment templates and review packets."
        title="Collections"
      />
      <div className="question-authoring-grid">
        <CollectionManager />
        <QuestionTable questions={data.questions.slice(0, 8)} />
      </div>
    </>
  );
}
