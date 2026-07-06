export type StudentDataStatus = "available" | "partial" | "unavailable";
export type LearningStatus = "not_started" | "in_progress" | "completed" | "paused";
export type TimelineEventType = "lesson" | "assessment" | "certificate" | "reminder";
export type NotificationType =
  | "learning_reminder"
  | "assessment_reminder"
  | "certificate_ready"
  | "mentor_feedback"
  | "system_announcement"
  | "ai_recommendation";

export interface StudentProfileSummary {
  avatarUrl: string | null;
  badges: number | null;
  currentOrganization: string | null;
  currentOrganizationId: string | null;
  currentTrack: string | null;
  level: number | null;
  name: string;
  rank: string | null;
  xp: number | null;
}

export interface StudentCourse {
  category: string | null;
  completedLessons: number;
  courseId: string;
  description: string;
  dueAt: string | null;
  estimatedMinutes: number | null;
  lastViewedAt: string | null;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  progress: number;
  status: LearningStatus;
  title: string;
  totalLessons: number;
}

export interface StudentActivity {
  activityId: string;
  occurredAt: string;
  title: string;
  type: TimelineEventType;
}

export interface StudentGoal {
  completed: number;
  goalId: string;
  label: string;
  period: "today" | "week" | "month";
  target: number;
  unit: "lessons" | "minutes" | "courses" | "plans";
}

export interface StudentNotification {
  createdAt: string;
  notificationId: string;
  readAt: string | null;
  summary: string;
  title: string;
  type: NotificationType;
}

export interface StudentAchievement {
  achievementId: string;
  description: string;
  earnedAt: string;
  title: string;
}

export interface StudentCertificate {
  certificateId: string;
  courseTitle: string;
  issuedAt: string;
  status: string;
}

export interface StudentBookmark {
  bookmarkId: string;
  label: string;
  targetId: string;
  targetType: "lesson" | "resource";
}

export interface StudentDownload {
  downloadId: string;
  label: string;
  resourceId: string;
  status: "available" | "expired";
}

export interface StudentRecommendation {
  explanation: string;
  recommendationId: string;
  targetId: string;
  targetType: "course" | "lesson";
  title: string;
}

export interface StudentLearningSearchResult {
  courseId: string | null;
  description: string;
  resultId: string;
  title: string;
  type: "course" | "lesson" | "resource" | "bookmark";
}

export interface StudentProgress {
  assessmentProgress: number | null;
  completion: number | null;
  monthlyActiveMinutes: number | null;
  skillProgress: Array<{ label: string; value: number }>;
  studyMinutes: number | null;
  trackProgress: number | null;
  weeklyActiveMinutes: number | null;
}

export interface StudentWorkspaceData {
  achievements: StudentAchievement[];
  activities: StudentActivity[];
  bookmarks: StudentBookmark[];
  certificates: StudentCertificate[];
  courses: StudentCourse[];
  downloads: StudentDownload[];
  goals: StudentGoal[];
  notifications: StudentNotification[];
  permissionGranted: boolean;
  profile: StudentProfileSummary;
  progress: StudentProgress;
  recommendations: StudentRecommendation[];
  status: StudentDataStatus;
  unavailableReason: string | null;
}

export interface StudentWorkspaceRepository {
  getStudentBookmarks(profileId: string, organizationId: string): Promise<StudentBookmark[]>;
  getStudentCourses(profileId: string, organizationId: string): Promise<StudentCourse[]>;
  getStudentGoals(profileId: string, organizationId: string): Promise<StudentGoal[]>;
  getStudentNotificationsView(
    profileId: string,
    organizationId: string
  ): Promise<{
    items: StudentNotification[];
    unavailableReason: string;
  }>;
  getStudentProgress(profileId: string, organizationId: string): Promise<StudentProgress>;
  getStudentTimeline(profileId: string, organizationId: string): Promise<StudentActivity[]>;
  searchStudentLearning(
    profileId: string,
    organizationId: string,
    query: string
  ): Promise<StudentLearningSearchResult[]>;
  getStudentWorkspaceSummary(
    profileId: string,
    organizationId: string
  ): Promise<Omit<StudentWorkspaceData, "permissionGranted" | "profile">>;
  getWorkspace(
    profileId: string,
    organizationId: string | null
  ): Promise<Omit<StudentWorkspaceData, "permissionGranted" | "profile">>;
}
