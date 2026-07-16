"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  History,
  Plus,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type {
  AssignmentSummary,
  AssignmentWorkspace,
  GradebookEntry,
  GradingQueueItem,
  RubricSummary
} from "@/features/assignments/types";
import { assignmentWorkflowSteps } from "@/features/assignments/workflow";
import { assignmentStatusTone, formatAssignmentDate } from "@/features/assignments/selectors";
import { isLateAssignment } from "@/features/assignments/validation";
import { Button } from "@/shared/ui/button";
import { Card, Table, Timeline } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";
import "@/features/assignments/assignments.css";

export function AssignmentHeader({
  title,
  description,
  mode = "student"
}: {
  title: string;
  description: string;
  mode?: "student" | "mentor" | "admin";
}) {
  return (
    <header className="assignment-header">
      <div>
        <span className="student-eyebrow">Assignments and grading</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {mode === "admin" ? (
        <Button asChild variant="secondary">
          <Link href={"/admin/assignments/new" as Route}>
            <Plus />
            New assignment
          </Link>
        </Button>
      ) : null}
    </header>
  );
}
export function AssignmentPermissionDenied() {
  return (
    <ErrorState
      title="Assignment access required"
      description="Your active organization does not grant access to this assignment workspace."
    />
  );
}
export function AssignmentUnavailable() {
  return (
    <ErrorState
      title="Assignment unavailable"
      description="This assignment is unavailable, archived, or outside your organization context."
    />
  );
}
export function AssignmentLoading() {
  return <LoadingState label="Loading assignment workspace" />;
}
export function AssignmentEmpty({ mode }: { mode: "student" | "mentor" | "admin" }) {
  const descriptions = {
    student: "Assigned work will appear when a published assignment is allocated to you.",
    mentor: "Submissions appear after learners submit work inside your assigned organization.",
    admin: "Create an assignment draft to begin the review and publication workflow."
  };
  return <EmptyState title="No assignments available" description={descriptions[mode]} />;
}
export function AssignmentDashboard({
  data,
  mode
}: {
  data: AssignmentWorkspace;
  mode: "student" | "mentor" | "admin";
}) {
  return (
    <div className="assignment-shell">
      <AssignmentMetrics data={data} />
      <div className="assignment-grid">
        <AssignmentTable assignments={data.assignments} mode={mode} />
        {mode !== "student" ? (
          <GradingQueue items={data.gradingQueue} />
        ) : (
          <AssignmentDeadlineCard assignment={data.assignments[0] ?? null} />
        )}
        <RubricPreview rubrics={data.rubrics} />
        <GradebookTable entries={data.gradebook} mode={mode} />
      </div>
    </div>
  );
}
export function AssignmentMetrics({ data }: { data: AssignmentWorkspace }) {
  const values = [
    ["Assignments", data.assignments.length, <BookOpenCheck key="a" />],
    [
      "Awaiting grading",
      data.gradingQueue.filter((item) => item.status !== "completed").length,
      <Users key="q" />
    ],
    ["Rubrics", data.rubrics.length, <FileText key="r" />],
    [
      "Released grades",
      data.gradebook.filter((item) => item.released).length,
      <GraduationCap key="g" />
    ]
  ] as const;
  return (
    <section className="assignment-metrics">
      {values.map(([label, value, icon]) => (
        <Card className="assignment-stat" key={label}>
          <div className="student-card-heading">
            <span className="student-eyebrow">{label}</span>
            {icon}
          </div>
          <strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}
export function AssignmentTable({
  assignments,
  mode
}: {
  assignments: AssignmentSummary[];
  mode: "student" | "mentor" | "admin";
}) {
  return (
    <Card className="assignment-panel">
      <div className="student-card-heading">
        <h2>Assignments</h2>
        <ResponsiveAssignmentFilters />
      </div>
      <Table
        caption="Assignments"
        rows={assignments}
        emptyMessage="No assignments available"
        columns={[
          {
            key: "title",
            header: "Assignment",
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                <small>{row.submissionType.replaceAll("_", " ")}</small>
              </div>
            )
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <AssignmentStatusBadge status={row.status} />
          },
          { key: "due", header: "Due", render: (row) => formatAssignmentDate(row.dueAt) },
          {
            key: "open",
            header: "Open",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={("/" + mode + "/assignments/" + row.assignmentId) as Route}>Open</Link>
              </Button>
            )
          }
        ]}
      />
    </Card>
  );
}
export function AssignmentCard({
  assignment,
  mode = "student"
}: {
  assignment: AssignmentSummary;
  mode?: "student" | "mentor" | "admin";
}) {
  return (
    <Card className="assignment-card">
      <div className="student-card-heading">
        <h2>{assignment.title}</h2>
        <AssignmentStatusBadge status={assignment.status} />
      </div>
      <p>{assignment.submissionType.replaceAll("_", " ")}</p>
      <AssignmentDeadlineCard assignment={assignment} />
      <Button asChild size="sm">
        <Link href={("/" + mode + "/assignments/" + assignment.assignmentId) as Route}>
          Open assignment
        </Link>
      </Button>
    </Card>
  );
}
export function AssignmentStatusBadge({ status }: { status: string }) {
  return <Badge tone={assignmentStatusTone(status)}>{status.replaceAll("_", " ")}</Badge>;
}
export function AssignmentDeadlineCard({ assignment }: { assignment: AssignmentSummary | null }) {
  if (!assignment)
    return (
      <EmptyState
        title="No upcoming deadline"
        description="Deadlines appear after assignments are allocated."
      />
    );
  const late = isLateAssignment(assignment);
  return (
    <Card className="assignment-deadline">
      <div className="student-card-heading">
        <h2>Deadline</h2>
        <Clock3 />
      </div>
      <strong>{formatAssignmentDate(assignment.dueAt)}</strong>
      {late ? <LateSubmissionWarning /> : null}
    </Card>
  );
}
export function LateSubmissionWarning() {
  return (
    <div className="assignment-warning" role="alert">
      <AlertTriangle />
      The due date has passed. The configured late policy will apply.
    </div>
  );
}
export function AssignmentEditor({ assignment }: { assignment: AssignmentSummary | null }) {
  return (
    <div className="assignment-editor">
      <Card className="assignment-panel">
        <h2>{assignment?.title ?? "New assignment"}</h2>
        <AssignmentMetadataEditor assignment={assignment} />
        <AssignmentInstructionsEditor />
        <AutosaveIndicator />
      </Card>
      <aside>
        <AssignmentWorkflowTimeline status={assignment?.status ?? "draft"} />
        <AssignmentPublicationPanel status={assignment?.status ?? "draft"} />
      </aside>
    </div>
  );
}
export function AssignmentMetadataEditor({ assignment }: { assignment: AssignmentSummary | null }) {
  return (
    <dl className="assignment-facts">
      <div>
        <dt>Submission type</dt>
        <dd>{assignment?.submissionType.replaceAll("_", " ") ?? "Select during draft creation"}</dd>
      </div>
      <div>
        <dt>Total marks</dt>
        <dd>{assignment?.totalMarks ?? 0}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{assignment?.status ?? "draft"}</dd>
      </div>
    </dl>
  );
}
export function AssignmentInstructionsEditor() {
  return (
    <Card className="assignment-subpanel">
      <h3>Instructions</h3>
      <p>
        Structured assignment instructions, learning outcomes, file constraints and grading rules
        are stored in the active assignment version.
      </p>
    </Card>
  );
}
export function AssignmentWorkflowTimeline({ status }: { status: string }) {
  return (
    <Card className="assignment-panel">
      <h2>Workflow</h2>
      <Timeline
        items={assignmentWorkflowSteps().map((step) => ({
          title: step,
          content: (
            <span>
              {step.toLowerCase().replaceAll(" ", "_") === status
                ? "Current stage"
                : "Lifecycle stage"}
            </span>
          )
        }))}
      />
    </Card>
  );
}
export function AssignmentVersionHistory({ assignment }: { assignment: AssignmentSummary | null }) {
  return (
    <Card className="assignment-panel">
      <div className="student-card-heading">
        <h2>Version history</h2>
        <History />
      </div>
      {assignment ? (
        <p>Published content is pinned to version {assignment.assignmentVersionId.slice(0, 8)}.</p>
      ) : (
        <EmptyState
          title="No versions"
          description="Versions appear after the first draft is saved."
        />
      )}
    </Card>
  );
}
export function AssignmentPublicationPanel({ status }: { status: string }) {
  return (
    <Card className="assignment-panel">
      <div className="student-card-heading">
        <h2>Publication</h2>
        <ShieldCheck />
      </div>
      <AssignmentStatusBadge status={status} />
      <p>Review and publication writes are controlled and published versions are immutable.</p>
    </Card>
  );
}
export function AssignmentSubmissionForm({ assignment }: { assignment: AssignmentSummary }) {
  return (
    <div className="assignment-grid">
      <Card className="assignment-panel">
        <h2>Submission</h2>
        <SubmissionTextEditor submissionType={assignment.submissionType} />
        <SubmissionFileUploader />
        <SubmissionConfirmationDialog />
      </Card>
      <AssignmentDeadlineCard assignment={assignment} />
    </div>
  );
}
export function SubmissionTextEditor({ submissionType }: { submissionType: string }) {
  return (
    <label className="assignment-field">
      <span>Response</span>
      <textarea
        aria-label="Assignment response"
        disabled={
          !["text_response", "rich_text_response", "url_submission", "case_study"].includes(
            submissionType
          )
        }
        rows={10}
      />
    </label>
  );
}
export function SubmissionFileUploader() {
  return (
    <div className="assignment-uploader">
      <Upload />
      <strong>Private assignment files</strong>
      <p>
        Files are validated before upload and remain quarantined until scan status allows access.
      </p>
      <input aria-label="Select assignment files" multiple type="file" />
    </div>
  );
}
export function SubmissionFileList() {
  return (
    <EmptyState
      title="No files attached"
      description="Validated private files appear here before submission."
    />
  );
}
export function SubmissionConfirmationDialog() {
  return (
    <Card className="assignment-subpanel">
      <h3>Submit work</h3>
      <p>Submitting seals the current version. Later edits require an approved resubmission.</p>
      <Button type="button">
        <CheckCircle2 />
        Confirm submission
      </Button>
    </Card>
  );
}
export function SubmissionHistory({ assignment }: { assignment: AssignmentSummary | null }) {
  return (
    <Card className="assignment-panel">
      <h2>Submission history</h2>
      {assignment?.submissionId ? (
        <Timeline
          items={[
            { title: "Submission created", content: <span>{assignment.submissionStatus}</span> }
          ]}
        />
      ) : (
        <EmptyState
          title="No submission history"
          description="Submission versions and immutable status events will appear here."
        />
      )}
    </Card>
  );
}
export function ResubmissionBanner() {
  return (
    <div className="assignment-warning" role="status">
      <AlertTriangle />A grader requested a new submission version. Previous work remains unchanged.
    </div>
  );
}
export function FeedbackThread() {
  return (
    <Card className="assignment-panel">
      <h2>Feedback thread</h2>
      <EmptyState
        title="No released feedback"
        description="Released grader messages and learner replies appear here."
      />
    </Card>
  );
}
export function FeedbackMessage({ author, body }: { author: string; body: string }) {
  return (
    <article className="assignment-message">
      <strong>{author}</strong>
      <p>{body}</p>
    </article>
  );
}
export function GradingQueue({ items }: { items: GradingQueueItem[] }) {
  return (
    <Card className="assignment-panel">
      <h2>Grading queue</h2>
      <Table
        caption="Grading queue"
        rows={items}
        emptyMessage="No submissions awaiting grading"
        columns={[
          { key: "assignment", header: "Assignment", render: (row) => row.assignmentTitle },
          {
            key: "status",
            header: "Status",
            render: (row) => <AssignmentStatusBadge status={row.status} />
          },
          { key: "priority", header: "Priority", render: (row) => row.priority },
          {
            key: "review",
            header: "Review",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={("/mentor/grading/" + row.submissionVersionId) as Route}>Review</Link>
              </Button>
            )
          }
        ]}
      />
    </Card>
  );
}
export function SubmissionReviewPanel({ item }: { item: GradingQueueItem | null }) {
  if (!item) return <AssignmentUnavailable />;
  return (
    <div className="assignment-editor">
      <Card className="assignment-panel">
        <h2>{item.assignmentTitle}</h2>
        <p>
          Learner evidence is available through authorized submission projections and signed file
          access.
        </p>
        <RubricScoringGrid />
      </Card>
      <aside>
        <OverallFeedbackEditor />
        <GradeReleasePanel status={item.status} />
      </aside>
    </div>
  );
}
export function RubricBuilder({ rubric }: { rubric: RubricSummary | null }) {
  return (
    <div className="assignment-editor">
      <Card className="assignment-panel">
        <h2>{rubric?.name ?? "New rubric"}</h2>
        <RubricCriteriaEditor />
        <RubricLevelEditor />
        <AutosaveIndicator />
      </Card>
      <aside>
        <RubricPreview rubrics={rubric ? [rubric] : []} />
      </aside>
    </div>
  );
}
export function RubricCriteriaEditor() {
  return (
    <Card className="assignment-subpanel">
      <h3>Weighted criteria</h3>
      <p>Criteria weights must total 100 before publication.</p>
    </Card>
  );
}
export function RubricLevelEditor() {
  return (
    <Card className="assignment-subpanel">
      <h3>Performance levels</h3>
      <p>Levels, score ranges and descriptions are versioned inside each rubric criterion.</p>
    </Card>
  );
}
export function RubricPreview({ rubrics }: { rubrics: RubricSummary[] }) {
  return (
    <Card className="assignment-panel">
      <h2>Rubrics</h2>
      {rubrics.length ? (
        <div className="assignment-list">
          {rubrics.map((rubric) => (
            <div key={rubric.rubricId}>
              <span>{rubric.name}</span>
              <AssignmentStatusBadge status={rubric.status} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No rubrics available"
          description="Published and organization draft rubrics appear here."
        />
      )}
    </Card>
  );
}
export function RubricScoringGrid() {
  return (
    <Card className="assignment-subpanel">
      <h3>Rubric scoring</h3>
      <p>Criterion scores and comments are saved as draft events before finalization.</p>
    </Card>
  );
}
export function CriterionFeedbackEditor() {
  return (
    <label className="assignment-field">
      <span>Criterion feedback</span>
      <textarea aria-label="Criterion feedback" rows={4} />
    </label>
  );
}
export function OverallFeedbackEditor() {
  return (
    <Card className="assignment-panel">
      <h2>Overall feedback</h2>
      <textarea aria-label="Overall feedback" rows={8} />
      <GradingDraftIndicator />
    </Card>
  );
}
export function GradingDraftIndicator() {
  return (
    <div className="assignment-autosave" role="status">
      <Clock3 />
      Grading draft
    </div>
  );
}
export function FinalizeGradeDialog() {
  return (
    <Card className="assignment-subpanel">
      <h3>Finalize grade</h3>
      <p>Finalization creates immutable grading and gradebook evidence.</p>
      <Button>
        <ShieldCheck />
        Finalize
      </Button>
    </Card>
  );
}
export function GradeReleasePanel({ status }: { status: string }) {
  return (
    <Card className="assignment-panel">
      <h2>Grade release</h2>
      <AssignmentStatusBadge status={status} />
      <p>Learners only see grades and feedback after controlled release.</p>
      <FinalizeGradeDialog />
    </Card>
  );
}
export function GradebookTable({
  entries,
  mode
}: {
  entries: GradebookEntry[];
  mode: "student" | "mentor" | "admin";
}) {
  return (
    <Card className="assignment-panel">
      <h2>
        {mode === "student"
          ? "Learner gradebook"
          : mode === "mentor"
            ? "Mentor gradebook"
            : "Organization gradebook"}
      </h2>
      <Table
        caption="Assignment gradebook"
        rows={entries}
        emptyMessage="No gradebook entries available"
        columns={[
          { key: "assignment", header: "Assignment", render: (row) => row.assignmentTitle },
          { key: "score", header: "Score", render: (row) => row.score ?? "Unreleased" },
          { key: "attempts", header: "Attempts", render: (row) => row.attemptCount },
          {
            key: "status",
            header: "Status",
            render: (row) => <AssignmentStatusBadge status={row.status} />
          }
        ]}
      />
    </Card>
  );
}
export const LearnerGradebook = GradebookTable;
export const MentorGradebook = GradebookTable;
export const CourseGradebook = GradebookTable;
export function GradeHistoryTimeline({ entry }: { entry: GradebookEntry | null }) {
  const item = entry
    ? {
        title: entry.status,
        content: <span>{entry.score ?? "Unreleased"}</span>,
        ...(entry.releasedAt ? { time: entry.releasedAt } : {})
      }
    : null;
  return (
    <Card className="assignment-panel">
      <h2>Grade history</h2>
      {item ? (
        <Timeline items={[item]} />
      ) : (
        <EmptyState
          title="No grade history"
          description="Historical gradebook events appear after grading."
        />
      )}
    </Card>
  );
}
export function AutosaveIndicator() {
  return (
    <div className="assignment-autosave" role="status">
      <CheckCircle2 />
      Changes are versioned
    </div>
  );
}
export function ConflictResolution() {
  return (
    <ErrorState
      title="Version conflict"
      description="This draft changed in another session. Reload the latest version before saving again."
    />
  );
}
export function ResponsiveAssignmentFilters() {
  return (
    <div className="assignment-filters">
      <label>
        <span className="sr-only">Search assignments</span>
        <input aria-label="Search assignments" placeholder="Search" type="search" />
      </label>
      <select aria-label="Filter assignment status">
        <option>All statuses</option>
        <option>Assigned</option>
        <option>Submitted</option>
        <option>Graded</option>
      </select>
    </div>
  );
}
