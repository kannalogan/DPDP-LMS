import {
  PublishingQueue,
  QuestionBankHeader,
  QuestionPermissionDenied
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function QuestionPublishingPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Publish approved questions and assessment templates into the frozen assessment runtime model."
        title="Publishing"
      />
      <PublishingQueue questions={data.questions} />
    </>
  );
}
