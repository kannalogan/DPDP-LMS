import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  FeedbackThread
} from "@/features/assignments/components";
import { canAccessAssignments } from "@/features/assignments/server";
export default async function AssignmentFeedbackPage() {
  if (!(await canAccessAssignments("student"))) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Assignment feedback"
        description="Review released grades, rubric scores and grader feedback."
      />
      <FeedbackThread />
    </>
  );
}
