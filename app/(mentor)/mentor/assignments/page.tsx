import {
  AssignmentDashboard,
  AssignmentEmpty,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function MentorAssignmentsPage() {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("mentor");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Mentor assignments"
        description="Review published assignments, learner work and grading activity."
        mode="mentor"
      />
      {data.assignments.length ? (
        <AssignmentDashboard data={data} mode="mentor" />
      ) : (
        <AssignmentEmpty mode="mentor" />
      )}
    </>
  );
}
