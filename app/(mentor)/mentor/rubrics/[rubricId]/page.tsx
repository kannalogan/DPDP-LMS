import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricBuilder
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function MentorRubricPage({
  params
}: {
  params: Promise<{ rubricId: string }>;
}) {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("mentor");
  const { rubricId } = await params;
  const rubric = data?.rubrics.find((item) => item.rubricId === rubricId) ?? null;
  return (
    <>
      <AssignmentHeader
        title={rubric?.name ?? "Rubric"}
        description="Review criteria, levels and immutable version history."
        mode="mentor"
      />
      <RubricBuilder rubric={rubric} />
    </>
  );
}
