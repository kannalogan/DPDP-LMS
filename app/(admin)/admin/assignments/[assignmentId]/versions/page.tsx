import {
  AssignmentHeader,
  AssignmentPermissionDenied,
  AssignmentVersionHistory
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function AssignmentVersionsPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("admin", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title="Assignment versions"
        description="Review immutable publication and draft version history."
        mode="admin"
      />
      <AssignmentVersionHistory assignment={assignment} />
    </>
  );
}
