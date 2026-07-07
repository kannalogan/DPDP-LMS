import type {
  MentorAnnouncementItem,
  MentorCohortSummary,
  MentorDashboardSummary,
  MentorLearnerSummary,
  MentorReviewItem,
  MentorReviewStatus,
  MentorTaskItem
} from "@/features/mentor/types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function reviewStatus(value: unknown): MentorReviewStatus {
  const candidate = text(value, "open");
  return ["open", "assigned", "in_review", "resolved", "dismissed", "appealed", "closed"].includes(
    candidate
  )
    ? (candidate as MentorReviewStatus)
    : "open";
}

export function mapCohort(row: Row): MentorCohortSummary {
  return {
    assignedLearners: number(row.assigned_learners),
    cohortId: text(row.cohort_id),
    cohortName: text(row.cohort_name, "Cohort"),
    lastActivityAt: nullableText(row.last_activity_at),
    learnersNeedingAttention: number(row.learners_needing_attention),
    openTasks: number(row.open_tasks),
    pendingReviews: number(row.pending_reviews)
  };
}

export function summarizeDashboard(cohorts: MentorCohortSummary[]): MentorDashboardSummary {
  return cohorts.reduce(
    (summary, cohort) => ({
      activeCohorts: summary.activeCohorts + 1,
      assignedLearners: summary.assignedLearners + cohort.assignedLearners,
      learnersNeedingAttention: summary.learnersNeedingAttention + cohort.learnersNeedingAttention,
      openTasks: summary.openTasks + cohort.openTasks,
      pendingReviews: summary.pendingReviews + cohort.pendingReviews
    }),
    {
      activeCohorts: 0,
      assignedLearners: 0,
      learnersNeedingAttention: 0,
      openTasks: 0,
      pendingReviews: 0
    }
  );
}

export function mapLearner(row: Row): MentorLearnerSummary {
  return {
    activeRiskCount: number(row.active_risk_count),
    certificateCount: number(row.certificate_count),
    cohortId: text(row.cohort_id),
    completedEnrollments: number(row.completed_enrollments),
    enrollmentCount: number(row.enrollment_count),
    lastActivityAt: nullableText(row.last_activity_at),
    learnerDisplayName: text(row.learner_display_name, "Learner"),
    learnerId: text(row.learner_profile_id),
    upcomingAssessments: number(row.upcoming_assessments)
  };
}

export function mapTask(row: Row): MentorTaskItem {
  return {
    completedAt: nullableText(row.completed_at),
    followUpAt: nullableText(row.follow_up_at),
    learnerId: text(row.learner_profile_id),
    reason: text(row.reason),
    taskId: text(row.id),
    taskType: text(row.task_type),
    type: text(row.type)
  };
}

export function mapReview(row: Row): MentorReviewItem {
  return {
    learnerId: text(row.learner_profile_id),
    periodEnd: text(row.period_end),
    periodStart: text(row.period_start),
    reviewId: text(row.id),
    status: reviewStatus(row.status),
    updatedAt: text(row.updated_at)
  };
}

export function mapAnnouncement(row: Row): MentorAnnouncementItem {
  return {
    announcementId: text(row.id),
    publishAt: text(row.publish_at),
    status: text(row.status),
    title: text(row.title)
  };
}
