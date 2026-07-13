import {
  AssignmentEditor,
  AssignmentHeader,
  AssignmentPermissionDenied
} from "@/features/assignments/components";
import { canAccessAssignments } from "@/features/assignments/server";
export default async function NewAssignmentPage() {
  if (!(await canAccessAssignments("admin"))) return <AssignmentPermissionDenied />;
  return (
    <>
      <AssignmentHeader
        title="New assignment"
        description="Create a versioned assignment draft for review."
        mode="admin"
      />
      <AssignmentEditor assignment={null} />
    </>
  );
}
