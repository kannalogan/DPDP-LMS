import {
  AssignmentDashboard,
  AssignmentEmpty,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function AdminAssignmentsPage() {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("admin");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Assignment authoring"
        description="Author, review and publish organization assignments and grading policy."
        mode="admin"
      />
      {data.assignments.length ? (
        <AssignmentDashboard data={data} mode="admin" />
      ) : (
        <AssignmentEmpty mode="admin" />
      )}
    </>
  );
}
