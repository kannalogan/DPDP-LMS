import type { AssignmentSummary } from "@/features/assignments/types";
export function isLateAssignment(assignment: AssignmentSummary, now = new Date()) {
  return Boolean(
    assignment.dueAt &&
      new Date(assignment.dueAt).getTime() < now.getTime() &&
      !["submitted", "graded", "finalized"].includes(assignment.status)
  );
}
export function assignmentIsAvailable(assignment: AssignmentSummary) {
  return !["archived", "finalized"].includes(assignment.status);
}
