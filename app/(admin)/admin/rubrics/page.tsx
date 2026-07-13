import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricPreview
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function AdminRubricsPage() {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("admin");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Rubrics"
        description="Manage organization and platform rubric templates."
        mode="admin"
      />
      <RubricPreview rubrics={data.rubrics} />
    </>
  );
}
