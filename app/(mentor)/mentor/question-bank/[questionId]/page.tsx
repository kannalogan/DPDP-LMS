import {
  QuestionBankHeader,
  QuestionEditor,
  QuestionPermissionDenied,
  VersionHistory
} from "@/features/question-authoring/components";
import { canAccessQuestionAuthoring, getQuestionDraft } from "@/features/question-authoring/server";

export default async function MentorQuestionDraftPage({
  params
}: {
  params: Promise<{ questionId: string }>;
}) {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const { questionId } = await params;
  const question = await getQuestionDraft(questionId);
  return (
    <>
      <QuestionBankHeader
        description="Review prompt structure, workflow state and publication readiness."
        title={question?.type ?? "Question draft"}
      />
      <QuestionEditor question={question} />
      <VersionHistory question={question} />
    </>
  );
}
