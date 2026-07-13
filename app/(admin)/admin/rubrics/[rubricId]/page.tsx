import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricBuilder
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function AdminRubricPage({
  params
}: {
  params: Promise<{ rubricId: string }>;
}) {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("admin");
  const { rubricId } = await params;
  const rubric = data?.rubrics.find((item) => item.rubricId === rubricId) ?? null;
  return (
    <>
      <AssignmentHeader
        title={rubric?.name ?? "Rubric"}
        description="Review rubric criteria, levels and version lifecycle."
        mode="admin"
      />
      <RubricBuilder rubric={rubric} />
    </>
  );
}
