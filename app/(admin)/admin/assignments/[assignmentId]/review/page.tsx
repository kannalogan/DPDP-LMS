import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  AssignmentPublicationPanel,
  AssignmentWorkflowTimeline
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function AssignmentReviewPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("admin", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title="Assignment review"
        description="Review workflow evidence and publication controls."
        mode="admin"
      />
      <div className="assignment-grid">
        <AssignmentWorkflowTimeline status={assignment?.status ?? "draft"} />
        <AssignmentPublicationPanel status={assignment?.status ?? "draft"} />
      </div>
    </>
  );
}
