import {
  AssignmentDashboard,
  AssignmentEmpty,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function StudentAssignmentsPage() {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("student");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Assignments"
        description="Track assigned work, deadlines, submissions and released feedback."
      />
      {data.assignments.length ? (
        <AssignmentDashboard data={data} mode="student" />
      ) : (
        <AssignmentEmpty mode="student" />
      )}
    </>
  );
}
