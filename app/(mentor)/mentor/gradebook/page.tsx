import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  GradebookTable
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function MentorGradebookPage() {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("mentor");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Mentor gradebook"
        description="Review authorized learner grades and release states."
        mode="mentor"
      />
      <GradebookTable entries={data.gradebook} mode="mentor" />
    </>
  );
}
