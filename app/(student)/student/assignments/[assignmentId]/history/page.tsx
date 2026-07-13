import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  SubmissionHistory
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function SubmissionHistoryPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("student", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title="Submission history"
        description="Review immutable submission versions and status history."
      />
      <SubmissionHistory assignment={assignment} />
    </>
  );
}
