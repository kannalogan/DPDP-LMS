export type DeliveryStatus = "not_started" | "in_progress" | "completed" | "paused";

export interface DeliveryResource {
  bookmarked: boolean;
  href: string | null;
  kind: string;
  resourceId: string;
  resourceVersionId: string;
  title: string;
}

export interface DeliveryLessonSummary {
  completed: boolean;
  estimatedMinutes: number;
  lessonId: string;
  locked: boolean;
  position: number;
  progress: number;
  slug: string;
  title: string;
  type: string;
}

export interface DeliveryModuleSummary {
  completionRule: Record<string, unknown>;
  lessons: DeliveryLessonSummary[];
  locked: boolean;
  moduleId: string;
  position: number;
  progress: number;
  title: string;
}

export interface CourseCatalogItem {
  category: string | null;
  courseId: string;
  description: string;
  difficulty: string;
  enrollmentId: string | null;
  locale: string;
  progress: number;
  slug: string;
  status: DeliveryStatus;
  title: string;
  track: string;
}

export interface StudentCourseDetail extends CourseCatalogItem {
  courseVersionId: string;
  estimatedMinutes: number;
  modules: DeliveryModuleSummary[];
  outcomes: string[];
  resources: DeliveryResource[];
  tags: string[];
}

export interface StudentModuleDetail {
  course: StudentCourseDetail;
  module: DeliveryModuleSummary;
  nextLesson: DeliveryLessonSummary | null;
  previousLesson: DeliveryLessonSummary | null;
  resources: DeliveryResource[];
}

export interface LessonNavigationTarget {
  moduleId: string;
  slug: string;
  title: string;
}

export interface LessonNoteDto {
  body: string;
  noteId: string;
  updatedAt: string;
}

export interface LessonNotesView {
  available: boolean;
  items: LessonNoteDto[];
  reason: string | null;
}

export interface StudentLessonDetail {
  bodyMarkdown: string;
  bookmarked: boolean;
  course: Pick<StudentCourseDetail, "courseId" | "enrollmentId" | "progress" | "slug" | "title">;
  estimatedMinutes: number;
  lastViewedAt: string | null;
  lessonId: string;
  module: Pick<DeliveryModuleSummary, "moduleId" | "position" | "progress" | "title">;
  navigation: { next: LessonNavigationTarget | null; previous: LessonNavigationTarget | null };
  notes: LessonNoteDto[];
  notesAvailable: boolean;
  notesUnavailableReason: string | null;
  progress: number;
  resources: DeliveryResource[];
  resumePosition: Record<string, unknown>;
  slug: string;
  title: string;
  type: string;
}

export interface CourseCatalogFilters {
  category?: string | undefined;
  query?: string | undefined;
  status?: DeliveryStatus | "all" | undefined;
  track?: string | undefined;
}
