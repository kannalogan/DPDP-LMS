export type AuthoringWorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "rejected";

export type AuthoringCourse = {
  draftId: string;
  courseId: string | null;
  lessonCount: number;
  moduleCount: number;
  openReviews: number;
  organizationId: string | null;
  ownerProfileId: string;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  slug: string;
  title: string;
  trackId: string;
  updatedAt: string;
  visibility: string;
  workflowState: AuthoringWorkflowState;
};

export type AuthoringReview = {
  courseDraftId: string;
  decisionNotes: string | null;
  openedAt: string;
  reviewId: string;
  status: string;
};

export type AuthoringResource = {
  kind: string;
  resourceId: string;
  status: string;
  title: string;
  updatedAt: string;
};

export type PublishingQueueItem = {
  draftId: string;
  errorMessage: string | null;
  jobId: string;
  jobType: string;
  scheduledFor: string | null;
  status: string;
  title: string;
};

export type AuthoringMetrics = {
  approved: number;
  draft: number;
  published: number;
  review: number;
  scheduled: number;
};

export type AuthoringWorkspace = {
  courses: AuthoringCourse[];
  metrics: AuthoringMetrics;
  publishingQueue: PublishingQueueItem[];
  resources: AuthoringResource[];
  reviews: AuthoringReview[];
};
