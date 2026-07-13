import {
  AssignmentCard,
  AssignmentHeader,
  AssignmentPermissionDenied,
  AssignmentUnavailable
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function StudentAssignmentPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("student", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title={assignment?.title ?? "Assignment"}
        description="Review instructions, deadline, rubric and submission status."
      />
      {assignment ? <AssignmentCard assignment={assignment} /> : <AssignmentUnavailable />}
    </>
  );
}
