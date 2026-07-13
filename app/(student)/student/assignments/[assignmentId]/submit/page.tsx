import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  AssignmentSubmissionForm,
  AssignmentUnavailable
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function SubmitAssignmentPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("student", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title="Submit assignment"
        description="Save a private draft and seal the current submission version when ready."
      />
      {assignment ? (
        <AssignmentSubmissionForm assignment={assignment} />
      ) : (
        <AssignmentUnavailable />
      )}
    </>
  );
}
