import {
  AssignmentEditor,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments, getAssignmentDetail } from "@/features/assignments/server";
export default async function AdminAssignmentPage({
  params
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  const assignment = await getAssignmentDetail("admin", (await params).assignmentId);
  return (
    <>
      <AssignmentHeader
        title={assignment?.title ?? "Assignment"}
        description="Edit the current draft and inspect publication readiness."
        mode="admin"
      />
      <AssignmentEditor assignment={assignment} />
    </>
  );
}
