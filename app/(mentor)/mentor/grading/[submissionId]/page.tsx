import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  SubmissionReviewPanel
} from "@/features/assignments/components";
import { canAccessAssignments, getSubmissionReview } from "@/features/assignments/server";
export default async function GradingReviewPage({
  params
}: {
  params: Promise<{ submissionId: string }>;
}) {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const item = await getSubmissionReview((await params).submissionId);
  return (
    <>
      <AssignmentHeader
        title="Submission review"
        description="Grade the immutable submission version against its pinned rubric."
        mode="mentor"
      />
      <SubmissionReviewPanel item={item} />
    </>
  );
}
