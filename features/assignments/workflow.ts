import type { AssignmentStatus } from "@/features/assignments/types";
const transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["published", "archived"],
  published: ["assigned", "archived"],
  assigned: ["in_progress", "archived"],
  in_progress: ["submitted", "archived"],
  submitted: ["under_review"],
  under_review: ["graded", "returned", "resubmission_requested"],
  graded: ["finalized", "returned"],
  returned: ["in_progress", "archived"],
  resubmission_requested: ["resubmitted"],
  resubmitted: ["under_review"],
  finalized: ["archived"],
  archived: []
};
export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus) {
  return transitions[from].includes(to);
}
export function assignmentWorkflowSteps() {
  return [
    "Draft",
    "Review",
    "Publish",
    "Assigned",
    "In Progress",
    "Submitted",
    "Under Review",
    "Graded",
    "Returned / Resubmission",
    "Finalized",
    "Archived"
  ];
}
