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

export default async function MentorQuestionBankPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Author and review organization-scoped question drafts and assessment templates."
        title="Mentor question bank"
      />
      {data.questions.length || data.templates.length ? (
        <QuestionDashboard data={data} />
      ) : (
        <QuestionEmpty />
      )}
    </>
  );
}
