import type {
  AuthoringCourse,
  AuthoringMetrics,
  AuthoringResource,
  AuthoringReview,
  PublishingQueueItem
} from "@/features/course-authoring/types";

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const count = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0));

export function mapAuthoringCourse(row: Record<string, unknown>): AuthoringCourse {
  return {
    courseId: text(row.course_id) || null,
    draftId: text(row.draft_id),
    lessonCount: count(row.lesson_count),
    moduleCount: count(row.module_count),
    openReviews: count(row.open_reviews),
    organizationId: text(row.organization_id) || null,
    ownerProfileId: text(row.owner_profile_id),
    publishedAt: text(row.published_at) || null,
    scheduledPublishAt: text(row.scheduled_publish_at) || null,
    slug: text(row.slug),
    title: text(row.title, "Untitled course"),
    trackId: text(row.track_id),
    updatedAt: text(row.updated_at),
    visibility: text(row.visibility, "organization"),
    workflowState: text(row.workflow_state, "draft") as AuthoringCourse["workflowState"]
  };
}

export function mapReview(row: Record<string, unknown>): AuthoringReview {
  return {
    courseDraftId: text(row.course_draft_id),
    decisionNotes: text(row.decision_notes) || null,
    openedAt: text(row.opened_at),
    reviewId: text(row.id),
    status: text(row.status, "open")
  };
}

export function mapResource(row: Record<string, unknown>): AuthoringResource {
  return {
    kind: text(row.kind),
    resourceId: text(row.id),
    status: text(row.status, "draft"),
    title: text(row.title, "Untitled resource"),
    updatedAt: text(row.updated_at)
  };
}

export function mapPublishingJob(row: Record<string, unknown>): PublishingQueueItem {
  return {
    draftId: text(row.draft_id),
    errorMessage: text(row.error_message) || null,
    jobId: text(row.job_id),
    jobType: text(row.job_type),
    scheduledFor: text(row.scheduled_for) || null,
    status: text(row.status),
    title: text(row.title, "Untitled course")
  };
}

export function summarizeAuthoring(courses: AuthoringCourse[]): AuthoringMetrics {
  return courses.reduce<AuthoringMetrics>(
    (metrics, course) => {
      if (course.workflowState in metrics)
        metrics[course.workflowState as keyof AuthoringMetrics]++;
      return metrics;
    },
    { approved: 0, draft: 0, published: 0, review: 0, scheduled: 0 }
  );
}
