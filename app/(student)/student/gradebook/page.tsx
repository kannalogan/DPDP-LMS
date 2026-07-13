import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  GradebookTable
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function StudentGradebookPage() {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("student");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Gradebook"
        description="View released assignment grades and attempt history."
      />
      <GradebookTable entries={data.gradebook} mode="student" />
    </>
  );
}
