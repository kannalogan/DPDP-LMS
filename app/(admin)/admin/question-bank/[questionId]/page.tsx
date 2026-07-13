import {
  AssetPicker,
  ConflictResolution,
  MediaManager,
  QuestionBankHeader,
  QuestionEditor,
  QuestionPermissionDenied,
  VersionHistory
} from "@/features/question-authoring/components";
import { canAccessQuestionAuthoring, getQuestionDraft } from "@/features/question-authoring/server";

export default async function QuestionDraftPage({
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
        description="Edit prompt, answer choices, specialized metadata, review status and publication readiness."
        title={question?.type ?? "Question draft"}
      />
      <QuestionEditor question={question} />
      <div className="question-authoring-grid">
        <VersionHistory question={question} />
        <MediaManager />
        <AssetPicker />
        <ConflictResolution />
      </div>
    </>
  );
}
