import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  GradebookTable
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function AdminGradebookPage() {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("admin");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Organization gradebook"
        description="Review export-ready assignment grades and release history."
        mode="admin"
      />
      <GradebookTable entries={data.gradebook} mode="admin" />
    </>
  );
}
