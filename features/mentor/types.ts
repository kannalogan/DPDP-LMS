export type MentorRiskLevel = "low" | "medium" | "high" | "critical";
export type MentorReviewStatus =
  | "open"
  | "assigned"
  | "in_review"
  | "resolved"
  | "dismissed"
  | "appealed"
  | "closed";

export type MentorDashboardSummary = {
  activeCohorts: number;
  assignedLearners: number;
  learnersNeedingAttention: number;
  openTasks: number;
  pendingReviews: number;
};

export type MentorCohortSummary = {
  cohortId: string;
  cohortName: string;
  assignedLearners: number;
  learnersNeedingAttention: number;
  lastActivityAt: string | null;
  openTasks: number;
  pendingReviews: number;
};

export type MentorLearnerSummary = {
  activeRiskCount: number;
  certificateCount: number;
  cohortId: string;
  completedEnrollments: number;
  enrollmentCount: number;
  lastActivityAt: string | null;
  learnerDisplayName: string;
  learnerId: string;
  upcomingAssessments: number;
};

export type MentorTaskItem = {
  completedAt: string | null;
  followUpAt: string | null;
  learnerId: string;
  reason: string;
  taskId: string;
  taskType: string;
  type: string;
};

export type MentorReviewItem = {
  learnerId: string;
  periodEnd: string;
  periodStart: string;
  reviewId: string;
  status: MentorReviewStatus;
  updatedAt: string;
};

export type MentorAnnouncementItem = {
  announcementId: string;
  publishAt: string;
  status: string;
  title: string;
};

export type MentorWorkspaceData = {
  announcements: MentorAnnouncementItem[];
  cohorts: MentorCohortSummary[];
  learners: MentorLearnerSummary[];
  reviews: MentorReviewItem[];
  summary: MentorDashboardSummary;
  tasks: MentorTaskItem[];
};
