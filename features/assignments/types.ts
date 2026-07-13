export type AssignmentStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "graded"
  | "returned"
  | "resubmission_requested"
  | "resubmitted"
  | "finalized"
  | "archived";
export type AssignmentSummary = {
  assignmentId: string;
  assignmentVersionId: string;
  title: string;
  submissionType: string;
  status: string;
  dueAt: string | null;
  totalMarks: number;
  submissionId: string | null;
  submissionStatus: string | null;
};
export type GradingQueueItem = {
  queueItemId: string;
  submissionVersionId: string;
  learnerProfileId: string;
  assignmentTitle: string;
  status: string;
  priority: number;
  dueAt: string | null;
  graderProfileId: string | null;
};
export type RubricSummary = {
  rubricId: string;
  name: string;
  status: string;
  version: number;
  updatedAt: string;
};
export type GradebookEntry = {
  gradebookEntryId: string;
  assignmentTitle: string;
  learnerProfileId: string;
  score: number | null;
  finalGrade: string | null;
  status: string;
  attemptCount: number;
  late: boolean;
  released: boolean;
  releasedAt: string | null;
};
export type AssignmentWorkspace = {
  assignments: AssignmentSummary[];
  gradingQueue: GradingQueueItem[];
  rubrics: RubricSummary[];
  gradebook: GradebookEntry[];
};
export type AssignmentRepository = {
  getWorkspace(mode: "student" | "mentor" | "admin"): Promise<AssignmentWorkspace>;
  getAssignment(id: string): Promise<AssignmentSummary | null>;
  getSubmission(id: string): Promise<GradingQueueItem | null>;
};
