import {
  AssignmentEditor,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function MentorAssignmentPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("mentor", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title={assignment?.title ?? "Assignment"}
        description="Review assignment configuration and workflow."
        mode="mentor"
      />
      <AssignmentEditor assignment={assignment} />
    </>
  );
}
