import {
  QuestionBankHeader,
  QuestionDashboard,
  QuestionEmpty,
  QuestionPermissionDenied
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function AdminQuestionBankPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Manage reusable question drafts, imports, collections, templates, reviews and publishing."
        title="Question bank"
      />
      {data.questions.length || data.templates.length || data.importJobs.length ? (
        <QuestionDashboard data={data} />
      ) : (
        <QuestionEmpty />
      )}
    </>
  );
}
