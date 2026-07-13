import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  GradingQueue
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export default async function MentorGradingPage() {
  if (!(await canAccessAssignments("mentor"))) return <AssignmentPermissionDenied />;
  const data = await getAssignmentWorkspace("mentor");
  if (!data) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="Grading queue"
        description="Claim, review and finalize authorized learner submissions."
        mode="mentor"
      />
      <GradingQueue items={data.gradingQueue} />
    </>
  );
}
