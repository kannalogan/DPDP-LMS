import {
  ApprovalPanel,
  QuestionBankHeader,
  QuestionPermissionDenied,
  ReviewPanel
} from "@/features/question-authoring/components";
import {
  canAccessQuestionAuthoring,
  getQuestionAuthoringWorkspace
} from "@/features/question-authoring/server";

export default async function QuestionReviewsPage() {
  if (!(await canAccessQuestionAuthoring())) return <QuestionPermissionDenied />;
  const data = await getQuestionAuthoringWorkspace();
  if (!data) return <QuestionPermissionDenied />;
  return (
    <>
      <QuestionBankHeader
        description="Review submitted question drafts and assessment templates through controlled approval workflows."
        title="Reviews"
      />
      <div className="question-authoring-grid">
        <ReviewPanel questions={data.questions} />
        <ApprovalPanel questions={data.questions} />
      </div>
    </>
  );
}
