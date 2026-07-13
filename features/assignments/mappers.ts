import type {
  AssignmentSummary,
  GradebookEntry,
  GradingQueueItem,
  RubricSummary
} from "@/features/assignments/types";
type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));
export function mapAssignment(row: Row): AssignmentSummary {
  return {
    assignmentId: text(row.assignment_id),
    assignmentVersionId: text(row.assignment_version_id),
    title: text(row.title, "Assignment"),
    submissionType: text(row.submission_type),
    status: text(row.submission_status ?? row.status, "assigned"),
    dueAt: nullableText(row.due_at),
    totalMarks: number(row.total_marks),
    submissionId: nullableText(row.submission_id),
    submissionStatus: nullableText(row.submission_status)
  };
}
export function mapGradingQueueItem(row: Row): GradingQueueItem {
  return {
    queueItemId: text(row.grading_queue_item_id),
    submissionVersionId: text(row.submission_version_id),
    learnerProfileId: text(row.learner_profile_id),
    assignmentTitle: text(row.assignment_title, "Assignment"),
    status: text(row.status),
    priority: number(row.priority),
    dueAt: nullableText(row.due_at),
    graderProfileId: nullableText(row.grader_profile_id)
  };
}
export function mapRubric(row: Row): RubricSummary {
  return {
    rubricId: text(row.id),
    name: text(row.name, "Rubric"),
    status: text(row.status),
    version: number(row.version),
    updatedAt: text(row.updated_at)
  };
}
export function mapGradebookEntry(row: Row): GradebookEntry {
  return {
    gradebookEntryId: text(row.gradebook_entry_id),
    assignmentTitle: text(row.assignment_title, "Assignment"),
    learnerProfileId: text(row.learner_profile_id),
    score: row.score === null || row.score === undefined ? null : number(row.score),
    finalGrade: nullableText(row.final_grade),
    status: text(row.status),
    attemptCount: number(row.attempt_count),
    late: row.late === true,
    released: row.released === true,
    releasedAt: nullableText(row.released_at)
  };
}
