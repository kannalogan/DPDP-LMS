import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  RubricBuilder
} from "@/features/assignments/components";
import { canAccessAssignments } from "@/features/assignments/server";
export default async function MentorNewRubricPage() {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="New rubric"
        description="Define weighted criteria and performance levels."
        mode="mentor"
      />
      <RubricBuilder rubric={null} />
    </>
  );
}
