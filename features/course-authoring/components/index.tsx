import {
  Archive,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderTree,
  GitCompare,
  GripVertical,
  Lock,
  PencilLine,
  Search,
  Send,
  Tags,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  authoringStateTone,
  formatAuthoringDate,
  workflowSteps
} from "@/features/course-authoring/selectors";
import type {
  AuthoringCourse,
  AuthoringReview,
  AuthoringWorkspace,
  PublishingQueueItem
} from "@/features/course-authoring/types";
import { validatePublishDependencies } from "@/features/course-authoring/workflow";
import { Button } from "@/shared/ui/button";
import { Card, MarkdownRenderer, Table, Timeline } from "@/shared/ui/data-display";
import { SearchInput } from "@/shared/ui/forms";
import { Badge, EmptyState, ErrorState, LoadingState, Progress } from "@/shared/ui/feedback";

export function AuthoringPageHeader({
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="authoring-header">
      <div>
        <span className="student-eyebrow">Course authoring</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={"/admin/authoring/courses/new" as Route}>
          <PencilLine />
          New course
        </Link>
      </Button>
    </header>
  );
}

export function AuthoringPermissionDenied() {
  return (
    <ErrorState
      description="Your active organization does not grant course authoring access."
      title="Authoring access required"
    />
  );
}

export function AuthoringDashboard({ data }: { data: AuthoringWorkspace }) {
  return (
    <div className="authoring-shell">
      <AuthoringMetricsCards data={data} />
      <div className="authoring-grid">
        <CourseTable courses={data.courses.slice(0, 8)} />
        <PublishingQueue items={data.publishingQueue.slice(0, 6)} />
        <ResourceLibrary resources={data.resources.slice(0, 6)} />
        <ApprovalPanel reviews={data.reviews.slice(0, 6)} />
      </div>
    </div>
  );
}

export function AuthoringMetricsCards({ data }: { data: AuthoringWorkspace }) {
  const stats = [
    ["Drafts", data.metrics.draft, <PencilLine key="drafts" />],
    ["In review", data.metrics.review, <Send key="review" />],
    ["Scheduled", data.metrics.scheduled, <CalendarClock key="scheduled" />],
    ["Published", data.metrics.published, <CheckCircle2 key="published" />]
  ] as const;
  return (
    <section className="authoring-grid">
      {stats.map(([label, value, icon]) => (
        <Card className="authoring-card authoring-stat" key={label}>
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

export function CourseTable({ courses }: { courses: AuthoringCourse[] }) {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Courses</h2>
        <Search aria-hidden="true" />
      </div>
      <SearchAndFilters />
      <Table
        caption="Authoring courses"
        columns={[
          { header: "Course", key: "title", render: (row) => row.title },
          {
            header: "State",
            key: "state",
            render: (row) => (
              <Badge tone={authoringStateTone(row.workflowState)}>{row.workflowState}</Badge>
            )
          },
          { header: "Modules", key: "modules", render: (row) => row.moduleCount },
          { header: "Lessons", key: "lessons", render: (row) => row.lessonCount },
          {
            header: "Open",
            key: "open",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/authoring/courses/${row.draftId}` as Route}>Open</Link>
              </Button>
            )
          }
        ]}
        emptyMessage="No course drafts available"
        rows={courses}
      />
    </Card>
  );
}

export function CourseEditor({ course }: { course: AuthoringCourse | null }) {
  if (!course)
    return (
      <EmptyState
        description="Create a draft or select a course from the authoring list."
        title="No draft selected"
      />
    );
  const readiness = validatePublishDependencies(course);
  return (
    <div className="authoring-editor">
      <Card className="authoring-panel">
        <div className="student-card-heading">
          <div>
            <span className="student-eyebrow">{course.slug}</span>
            <h2>{course.title}</h2>
          </div>
          <Badge tone={authoringStateTone(course.workflowState)}>{course.workflowState}</Badge>
        </div>
        <MetadataEditor course={course} />
        <RichContentEditor />
        <AutosaveIndicator />
      </Card>
      <aside className="authoring-aside">
        <EditorLockBanner />
        <PublishingWizard course={course} />
        <Card className="authoring-panel">
          <h2>Publish validation</h2>
          <div className="authoring-list">
            {readiness.rules.map((rule) => (
              <div className="authoring-list-item" key={rule.title}>
                <Badge tone={rule.ok ? "success" : "warning"}>
                  {rule.ok ? "ready" : "needs work"}
                </Badge>
                <span>{rule.title}</span>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

export function ModuleEditor({ course }: { course: AuthoringCourse | null }) {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Module editor</h2>
        <GripVertical aria-hidden="true" />
      </div>
      {course ? (
        <div className="authoring-sort-list" aria-label="Module ordering">
          <div>
            <GripVertical aria-hidden="true" />
            <span>{course.moduleCount || 0} modules in draft</span>
          </div>
        </div>
      ) : (
        <EmptyState
          description="Module drafts appear after a course draft is selected."
          title="No modules"
        />
      )}
    </Card>
  );
}

export function LessonEditor({ course }: { course: AuthoringCourse | null }) {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Lesson editor</h2>
        <BookOpen aria-hidden="true" />
      </div>
      {course ? (
        <div className="authoring-sort-list" aria-label="Lesson ordering">
          <div>
            <GripVertical aria-hidden="true" />
            <span>{course.lessonCount || 0} lessons in draft</span>
          </div>
        </div>
      ) : (
        <EmptyState
          description="Lesson drafts appear after a course draft is selected."
          title="No lessons"
        />
      )}
    </Card>
  );
}

export function ResourceLibrary({ resources }: { resources: AuthoringWorkspace["resources"] }) {
  if (!resources.length)
    return (
      <EmptyState
        description="Approved PDFs, videos, downloads, and external resources will appear here."
        title="Resource library"
      />
    );
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Resource library</h2>
        <UploadCloud aria-hidden="true" />
      </div>
      <div className="authoring-list">
        {resources.map((resource) => (
          <article className="authoring-list-item" key={resource.resourceId}>
            <FileText aria-hidden="true" />
            <div>
              <strong>{resource.title}</strong>
              <p>{resource.kind}</p>
            </div>
            <Badge tone={authoringStateTone(resource.status)}>{resource.status}</Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function RichContentEditor() {
  return (
    <div className="authoring-content-editor">
      <h3>Rich content</h3>
      <MarkdownRenderer content="Draft body supports rich text, markdown preview, embeds, links, and downloadable resource references through the authoring RPC workflow." />
    </div>
  );
}

export function MarkdownPreview() {
  return (
    <Card className="authoring-panel">
      <h2>Markdown preview</h2>
      <MarkdownRenderer content="### Preview\n\nAuthoring content is rendered from the draft body before publication." />
    </Card>
  );
}

export function MetadataEditor({ course }: { course: AuthoringCourse }) {
  return (
    <dl className="authoring-metadata">
      <div>
        <dt>Visibility</dt>
        <dd>{course.visibility}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{formatAuthoringDate(course.updatedAt)}</dd>
      </div>
      <div>
        <dt>Published</dt>
        <dd>{formatAuthoringDate(course.publishedAt)}</dd>
      </div>
    </dl>
  );
}

export function PublishingWizard({ course }: { course: AuthoringCourse }) {
  const readiness = validatePublishDependencies(course);
  return (
    <Card className="authoring-panel">
      <h2>Publishing wizard</h2>
      <Progress label="Dependency readiness" value={readiness.ready ? 100 : 50} />
      <div className="authoring-actions">
        <Button size="sm" variant="secondary">
          <CalendarClock />
          Schedule
        </Button>
        <Button disabled={!readiness.ready} size="sm">
          <Send />
          Publish
        </Button>
      </div>
    </Card>
  );
}

export function WorkflowTimeline({ course }: { course?: AuthoringCourse | null }) {
  const active = course?.workflowState ?? "draft";
  return (
    <Card className="authoring-panel">
      <h2>Workflow timeline</h2>
      <Timeline
        items={workflowSteps().map((step) => ({
          content: <Badge tone={step === active ? "info" : "neutral"}>{step}</Badge>,
          title: step
        }))}
      />
    </Card>
  );
}

export function VersionHistory({ course }: { course?: AuthoringCourse | null }) {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Version history</h2>
        <GitCompare aria-hidden="true" />
      </div>
      <p>
        {course?.publishedAt
          ? `Last publication ${formatAuthoringDate(course.publishedAt)}`
          : "Publication versions appear after approval and release."}
      </p>
    </Card>
  );
}

export function ReviewComments({ reviews }: { reviews: AuthoringReview[] }) {
  if (!reviews.length)
    return (
      <EmptyState
        description="Lesson review comments and decisions appear when reviews are submitted."
        title="No review comments"
      />
    );
  return (
    <Card className="authoring-panel">
      <h2>Review comments</h2>
      <div className="authoring-list">
        {reviews.map((review) => (
          <article className="authoring-list-item" key={review.reviewId}>
            <Badge tone={authoringStateTone(review.status)}>{review.status}</Badge>
            <span>{review.decisionNotes ?? "Review is open"}</span>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ApprovalPanel({ reviews }: { reviews: AuthoringReview[] }) {
  if (!reviews.length)
    return (
      <EmptyState description="Submitted course reviews will appear here." title="Approval panel" />
    );
  return (
    <Card className="authoring-panel">
      <h2>Approval panel</h2>
      <div className="authoring-list">
        {reviews.map((review) => (
          <article className="authoring-list-item" key={review.reviewId}>
            <Badge tone={authoringStateTone(review.status)}>{review.status}</Badge>
            <span>{formatAuthoringDate(review.openedAt)}</span>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ContentTree({ course }: { course?: AuthoringCourse | null }) {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Content tree</h2>
        <FolderTree aria-hidden="true" />
      </div>
      <div className="authoring-tree">
        <span>{course?.title ?? "Course draft"}</span>
        <span>{course?.moduleCount ?? 0} modules</span>
        <span>{course?.lessonCount ?? 0} lessons</span>
      </div>
    </Card>
  );
}

export function AssetManager() {
  return (
    <Card className="authoring-panel">
      <h2>Asset manager</h2>
      <p>Course assets link approved resource library records to draft content.</p>
    </Card>
  );
}

export function CategoryManager() {
  return (
    <Card className="authoring-panel">
      <h2>Category manager</h2>
      <p>Content categories map to canonical course categories for publication.</p>
    </Card>
  );
}

export function TagManager() {
  return (
    <Card className="authoring-panel">
      <div className="student-card-heading">
        <h2>Tag manager</h2>
        <Tags aria-hidden="true" />
      </div>
      <p>Content labels reference canonical learning tags where available.</p>
    </Card>
  );
}

export function SearchAndFilters() {
  return (
    <div className="authoring-controls">
      <SearchInput aria-label="Search authoring courses" placeholder="Search courses" />
      <Button size="sm" variant="secondary">
        Filters
      </Button>
    </div>
  );
}

export function Pagination() {
  return (
    <nav aria-label="Authoring pagination" className="authoring-actions">
      <Button size="sm" variant="secondary">
        Previous
      </Button>
      <Button size="sm" variant="secondary">
        Next
      </Button>
    </nav>
  );
}

export function AuthoringLoading() {
  return <LoadingState label="Loading authoring workspace" />;
}

export function AuthoringError() {
  return (
    <ErrorState
      description="The authoring workspace could not be loaded from the current organization."
      title="Authoring unavailable"
    />
  );
}

export function AuthoringEmpty() {
  return (
    <EmptyState
      description="Course drafts, reviews, and publishing jobs appear after authors begin creating content."
      title="No authoring content"
    />
  );
}

export function ConflictResolution() {
  return (
    <Card className="authoring-panel">
      <h2>Conflict resolution</h2>
      <p>Active editor locks prevent parallel saves against the same draft.</p>
    </Card>
  );
}

export function EditorLockBanner() {
  return (
    <Card className="authoring-lock">
      <Lock aria-hidden="true" />
      <span>
        Editor locks are recorded through `lock_editor` and released through `unlock_editor`.
      </span>
    </Card>
  );
}

export function AutosaveIndicator() {
  return (
    <div className="authoring-autosave">
      <CheckCircle2 aria-hidden="true" />
      <span>Autosave uses `save_course_draft` and immutable version change logs.</span>
    </div>
  );
}

export function PublishingQueue({ items }: { items: PublishingQueueItem[] }) {
  if (!items.length)
    return (
      <EmptyState
        description="Scheduled publishing jobs will appear here."
        title="Publishing queue"
      />
    );
  return (
    <Card className="authoring-panel">
      <h2>Publishing queue</h2>
      <div className="authoring-list">
        {items.map((item) => (
          <article className="authoring-list-item" key={item.jobId}>
            <Archive aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <p>{formatAuthoringDate(item.scheduledFor)}</p>
            </div>
            <Badge tone={authoringStateTone(item.status)}>{item.status}</Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}
