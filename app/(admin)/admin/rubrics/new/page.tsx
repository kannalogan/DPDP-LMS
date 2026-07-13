import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricBuilder
} from "@/features/assignments/components";
import { canAccessAssignments } from "@/features/assignments/server";
export default async function AdminNewRubricPage() {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="New rubric"
        description="Create weighted criteria and versioned performance levels."
        mode="admin"
      />
      <RubricBuilder rubric={null} />
    </>
  );
}
