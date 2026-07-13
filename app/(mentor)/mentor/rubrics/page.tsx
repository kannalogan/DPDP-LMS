import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricPreview
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function MentorRubricsPage() {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("mentor");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Rubrics"
        description="Review and author organization-scoped rubric versions."
        mode="mentor"
      />
      <RubricPreview rubrics={data.rubrics} />
    </>
  );
}
