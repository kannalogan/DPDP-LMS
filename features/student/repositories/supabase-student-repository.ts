import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import type {
  LearningStatus,
  StudentActivity,
  StudentBookmark,
  StudentCourse,
  StudentGoal,
  StudentLearningSearchResult,
  StudentNotification,
  StudentProgress,
  StudentWorkspaceRepository
} from "@/features/student/types";

export interface EnrollmentCourseRow {
  completed_at: string | null;
  course_version:
    | {
        course:
          | { category: { name: string } | Array<{ name: string }> | null }
          | Array<{ category: { name: string } | Array<{ name: string }> | null }>;
        course_id: string;
        description: string;
        difficulty: string;
        id: string;
        modules: Array<{ id: string; lessons: Array<{ id: string }> }>;
        title: string;
      }
    | Array<{
        course:
          | { category: { name: string } | Array<{ name: string }> | null }
          | Array<{ category: { name: string } | Array<{ name: string }> | null }>;
        course_id: string;
        description: string;
        difficulty: string;
        id: string;
        modules: Array<{ id: string; lessons: Array<{ id: string }> }>;
        title: string;
      }>;
  course_version_id: string | null;
  due_at: string | null;
  enrolled_at: string;
  id: string;
  status: string;
}

type CourseProgressRow = { enrollment_id: string; progress: number | string; status: string };
type LessonProgressRow = {
  completed_at: string | null;
  enrollment_id: string;
  last_activity_at: string | null;
  lesson:
    | { id: string; lesson_versions: Array<{ status: string; title: string }> }
    | Array<{ id: string; lesson_versions: Array<{ status: string; title: string }> }>;
  lesson_id: string;
  status: string;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function toLearningStatus(status: string): LearningStatus {
  if (status === "active" || status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "paused") return "paused";
  return "not_started";
}

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

export function mapEnrollmentCourse(
  row: EnrollmentCourseRow,
  progress: CourseProgressRow | undefined,
  completedLessons: number
): StudentCourse | null {
  const version = one(row.course_version);
  if (!version) return null;
  const course = one(version.course);
  const category = course ? one(course.category) : null;
  const totalLessons = version.modules.reduce((total, module) => total + module.lessons.length, 0);
  return {
    category: category?.name ?? null,
    completedLessons,
    courseId: version.course_id,
    description: version.description,
    dueAt: row.due_at,
    estimatedMinutes: null,
    lastViewedAt: row.enrolled_at,
    nextLessonId: null,
    nextLessonTitle: null,
    progress: asNumber(progress?.progress),
    status: progress ? toLearningStatus(progress.status) : toLearningStatus(row.status),
    title: version.title,
    totalLessons
  };
}

function assertContext(
  profileId: string,
  organizationId: string | null
): asserts organizationId is string {
  if (!profileId || !organizationId) {
    throw new AppError("FORBIDDEN", "An active organization is required for student learning data");
  }
}

function throwRepositoryError(operation: string, error: { message: string } | null) {
  if (error) {
    throw new AppError("INTERNAL_SERVER_ERROR", `Unable to ${operation}`, { cause: error.message });
  }
}

export class SupabaseStudentWorkspaceRepository implements StudentWorkspaceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getStudentCourses(profileId: string, organizationId: string): Promise<StudentCourse[]> {
    assertContext(profileId, organizationId);
    const { data: enrollmentData, error: enrollmentError } = await this.client
      .from("enrollments")
      .select(
        "id,status,enrolled_at,due_at,completed_at,course_version_id,course_version:course_versions!inner(id,course_id,title,description,difficulty,course:courses!inner(category:course_categories(name)),modules:course_modules(id,lessons(id)))"
      )
      .eq("profile_id", profileId)
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .not("course_version_id", "is", null)
      .order("enrolled_at", { ascending: false });
    throwRepositoryError("load student courses", enrollmentError);
    const enrollments = (enrollmentData ?? []) as unknown as EnrollmentCourseRow[];
    if (!enrollments.length) return [];

    const enrollmentIds = enrollments.map((item) => item.id);
    const [{ data: progressData, error: progressError }, { data: lessonData, error: lessonError }] =
      await Promise.all([
        this.client
          .from("course_progress")
          .select("enrollment_id,status,progress")
          .in("enrollment_id", enrollmentIds),
        this.client
          .from("lesson_progress")
          .select("enrollment_id,status")
          .in("enrollment_id", enrollmentIds)
          .eq("status", "completed")
      ]);
    throwRepositoryError("load course progress", progressError);
    throwRepositoryError("load lesson progress", lessonError);
    const progressByEnrollment = new Map(
      ((progressData ?? []) as CourseProgressRow[]).map((item) => [item.enrollment_id, item])
    );
    const completedByEnrollment = new Map<string, number>();
    for (const item of (lessonData ?? []) as Array<{ enrollment_id: string }>) {
      completedByEnrollment.set(
        item.enrollment_id,
        (completedByEnrollment.get(item.enrollment_id) ?? 0) + 1
      );
    }
    return enrollments.flatMap((item) => {
      const mapped = mapEnrollmentCourse(
        item,
        progressByEnrollment.get(item.id),
        completedByEnrollment.get(item.id) ?? 0
      );
      return mapped ? [mapped] : [];
    });
  }

  async getStudentProgress(profileId: string, organizationId: string): Promise<StudentProgress> {
    assertContext(profileId, organizationId);
    const { data: enrollments, error: enrollmentError } = await this.client
      .from("enrollments")
      .select("id,learning_path_version_id")
      .eq("profile_id", profileId)
      .eq("organization_id", organizationId)
      .is("archived_at", null);
    throwRepositoryError("load progress enrollments", enrollmentError);
    const enrollmentIds = (enrollments ?? []).map((item) => item.id as string);
    if (!enrollmentIds.length) {
      return {
        assessmentProgress: null,
        completion: null,
        monthlyActiveMinutes: null,
        skillProgress: [],
        studyMinutes: null,
        trackProgress: null,
        weeklyActiveMinutes: null
      };
    }
    const { data, error } = await this.client
      .from("course_progress")
      .select("progress")
      .in("enrollment_id", enrollmentIds);
    throwRepositoryError("load student progress", error);
    const values = (data ?? []).map((item) => asNumber(item.progress as number | string));
    const completion = values.length
      ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
      : null;
    return {
      assessmentProgress: null,
      completion,
      monthlyActiveMinutes: null,
      skillProgress: [],
      studyMinutes: null,
      trackProgress: completion,
      weeklyActiveMinutes: null
    };
  }

  async getStudentTimeline(profileId: string, organizationId: string): Promise<StudentActivity[]> {
    assertContext(profileId, organizationId);
    const { data: enrollmentData, error: enrollmentError } = await this.client
      .from("enrollments")
      .select("id,due_at,course_version:course_versions(title)")
      .eq("profile_id", profileId)
      .eq("organization_id", organizationId)
      .is("archived_at", null);
    throwRepositoryError("load timeline enrollments", enrollmentError);
    const enrollments = (enrollmentData ?? []) as unknown as Array<{
      course_version: { title: string } | Array<{ title: string }>;
      due_at: string | null;
      id: string;
    }>;
    const enrollmentIds = enrollments.map((item) => item.id);
    const activities: StudentActivity[] = enrollments.flatMap((item) => {
      const version = one(item.course_version);
      return item.due_at && version
        ? [
            {
              activityId: `enrollment-due-${item.id}`,
              occurredAt: item.due_at,
              title: `${version.title} due`,
              type: "reminder" as const
            }
          ]
        : [];
    });
    if (!enrollmentIds.length) return activities;
    const { data, error } = await this.client
      .from("lesson_progress")
      .select(
        "enrollment_id,lesson_id,status,last_activity_at,completed_at,lesson:lessons(id,lesson_versions(title,status))"
      )
      .in("enrollment_id", enrollmentIds)
      .not("last_activity_at", "is", null)
      .order("last_activity_at", { ascending: false })
      .limit(100);
    throwRepositoryError("load learning timeline", error);
    for (const row of (data ?? []) as unknown as LessonProgressRow[]) {
      const lesson = one(row.lesson);
      const title = lesson?.lesson_versions.find((item) => item.status === "published")?.title;
      if (!row.last_activity_at || !title) continue;
      activities.push({
        activityId: `${row.enrollment_id}-${row.lesson_id}-${row.last_activity_at}`,
        occurredAt: row.completed_at ?? row.last_activity_at,
        title,
        type: "lesson"
      });
    }
    return activities.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }

  async getStudentGoals(profileId: string, organizationId: string): Promise<StudentGoal[]> {
    assertContext(profileId, organizationId);
    const { data, error } = await this.client
      .from("study_plans")
      .select("id,title,status,starts_on,ends_on")
      .eq("profile_id", profileId)
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    throwRepositoryError("load student goals", error);
    return (data ?? []).map((plan) => {
      const start = plan.starts_on ? new Date(plan.starts_on) : null;
      const end = plan.ends_on ? new Date(plan.ends_on) : null;
      const days =
        start && end ? Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1 : 30;
      return {
        completed: plan.status === "completed" ? 1 : 0,
        goalId: plan.id as string,
        label: plan.title as string,
        period: days <= 1 ? "today" : days <= 7 ? "week" : "month",
        target: 1,
        unit: "plans" as const
      };
    });
  }

  async getStudentBookmarks(profileId: string, organizationId: string): Promise<StudentBookmark[]> {
    assertContext(profileId, organizationId);
    const { data, error } = await this.client
      .from("learner_bookmarks")
      .select(
        "id,lesson_id,resource_version_id,lesson:lessons(slug),resource_version:resource_versions(resource:learning_resources(title))"
      )
      .eq("profile_id", profileId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    throwRepositoryError("load student bookmarks", error);
    return (data ?? []).flatMap<StudentBookmark>((raw) => {
      const row = raw as unknown as {
        id: string;
        lesson: { slug: string } | Array<{ slug: string }> | null;
        lesson_id: string | null;
        resource_version:
          | { resource: { title: string } | Array<{ title: string }> }
          | Array<{ resource: { title: string } | Array<{ title: string }> }>
          | null;
        resource_version_id: string | null;
      };
      if (row.lesson_id) {
        return [
          {
            bookmarkId: row.id,
            label: one(row.lesson)?.slug ?? "Saved lesson",
            targetId: row.lesson_id,
            targetType: "lesson" as const
          }
        ];
      }
      if (row.resource_version_id) {
        const resourceVersion = one(row.resource_version);
        return [
          {
            bookmarkId: row.id,
            label: one(resourceVersion?.resource)?.title ?? "Saved resource",
            targetId: row.resource_version_id,
            targetType: "resource" as const
          }
        ];
      }
      return [];
    });
  }

  async getStudentNotificationsView(profileId: string, organizationId: string) {
    assertContext(profileId, organizationId);
    const { data, error } = await this.client
      .from("notification_inbox_projection")
      .select("notification_id,type,purpose,title,summary,read_at,created_at")
      .eq("organization_id", organizationId)
      .eq("profile_id", profileId)
      .eq("folder", "inbox")
      .order("created_at", { ascending: false })
      .limit(20);
    throwRepositoryError("load student notifications", error);
    return {
      items: (data ?? []).map((row) => ({
        createdAt: row.created_at as string,
        notificationId: row.notification_id as string,
        readAt: (row.read_at as string | null) ?? null,
        summary: (row.summary as string) || (row.purpose as string),
        title: (row.title as string) || "Notification",
        type: (row.type === "assessment"
          ? "assessment_reminder"
          : row.type === "mentor"
            ? "mentor_feedback"
            : row.type === "announcement"
              ? "system_announcement"
              : "learning_reminder") as StudentNotification["type"]
      })),
      unavailableReason: ""
    };
  }

  async searchStudentLearning(
    profileId: string,
    organizationId: string,
    query: string
  ): Promise<StudentLearningSearchResult[]> {
    assertContext(profileId, organizationId);
    const normalized = query.trim().slice(0, 120);
    if (normalized.length < 2) return [];
    const pattern = `%${normalized.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const [courses, lessons, resources, bookmarks] = await Promise.all([
      this.client
        .from("course_versions")
        .select("id,course_id,title,description")
        .eq("status", "published")
        .ilike("title", pattern)
        .order("published_at", { ascending: false })
        .limit(20),
      this.client
        .from("lesson_versions")
        .select(
          "id,title,lesson:lessons!inner(course_module:course_modules!inner(course_version:course_versions!inner(course_id,status)))"
        )
        .eq("status", "published")
        .eq("lesson.course_module.course_version.status", "published")
        .ilike("title", pattern)
        .limit(20),
      this.client
        .from("learning_resources")
        .select(
          "id,title,kind,course_version:course_versions(course_id,status),lesson_version:lesson_versions(lesson:lessons(course_module:course_modules(course_version:course_versions(course_id,status))))"
        )
        .ilike("title", pattern)
        .limit(20),
      this.getStudentBookmarks(profileId, organizationId)
    ]);
    throwRepositoryError("search courses", courses.error);
    throwRepositoryError("search lessons", lessons.error);
    throwRepositoryError("search resources", resources.error);

    const results: StudentLearningSearchResult[] = (courses.data ?? []).map((item) => ({
      courseId: item.course_id as string,
      description: item.description as string,
      resultId: item.id as string,
      title: item.title as string,
      type: "course"
    }));
    for (const raw of lessons.data ?? []) {
      const row = raw as unknown as {
        id: string;
        lesson:
          | {
              course_module:
                | { course_version: { course_id: string } | Array<{ course_id: string }> }
                | Array<{ course_version: { course_id: string } | Array<{ course_id: string }> }>;
            }
          | Array<{
              course_module:
                | { course_version: { course_id: string } | Array<{ course_id: string }> }
                | Array<{ course_version: { course_id: string } | Array<{ course_id: string }> }>;
            }>;
        title: string;
      };
      const lesson = one(row.lesson);
      const courseModule = one(lesson?.course_module);
      const version = one(courseModule?.course_version);
      results.push({
        courseId: version?.course_id ?? null,
        description: "Published lesson",
        resultId: row.id,
        title: row.title,
        type: "lesson"
      });
    }
    for (const raw of resources.data ?? []) {
      const row = raw as unknown as {
        course_version:
          | { course_id: string; status: string }
          | Array<{ course_id: string; status: string }>
          | null;
        id: string;
        kind: string;
        lesson_version:
          | {
              lesson:
                | {
                    course_module:
                      | {
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }
                      | Array<{
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }>;
                  }
                | Array<{
                    course_module:
                      | {
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }
                      | Array<{
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }>;
                  }>;
            }
          | Array<{
              lesson:
                | {
                    course_module:
                      | {
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }
                      | Array<{
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }>;
                  }
                | Array<{
                    course_module:
                      | {
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }
                      | Array<{
                          course_version:
                            | { course_id: string; status: string }
                            | Array<{ course_id: string; status: string }>;
                        }>;
                  }>;
            }>
          | null;
        title: string;
      };
      const directVersion = one(row.course_version);
      const lessonVersion = one(row.lesson_version);
      const lesson = one(lessonVersion?.lesson);
      const courseModule = one(lesson?.course_module);
      const nestedVersion = one(courseModule?.course_version);
      const parent = directVersion ?? nestedVersion;
      results.push({
        courseId: parent?.status === "published" ? parent.course_id : null,
        description: row.kind,
        resultId: row.id,
        title: row.title,
        type: "resource"
      });
    }
    for (const bookmark of bookmarks.filter((item) =>
      item.label.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())
    )) {
      results.push({
        courseId: null,
        description: `Saved ${bookmark.targetType}`,
        resultId: bookmark.bookmarkId,
        title: bookmark.label,
        type: "bookmark"
      });
    }
    return results;
  }

  async getStudentWorkspaceSummary(profileId: string, organizationId: string) {
    assertContext(profileId, organizationId);
    const [courses, progress, activities, goals, bookmarks, notifications] = await Promise.all([
      this.getStudentCourses(profileId, organizationId),
      this.getStudentProgress(profileId, organizationId),
      this.getStudentTimeline(profileId, organizationId),
      this.getStudentGoals(profileId, organizationId),
      this.getStudentBookmarks(profileId, organizationId),
      this.getStudentNotificationsView(profileId, organizationId)
    ]);
    return {
      achievements: [],
      activities,
      bookmarks,
      certificates: [],
      courses,
      downloads: [],
      goals,
      notifications: notifications.items,
      progress,
      recommendations: [],
      status: "partial" as const,
      unavailableReason: notifications.unavailableReason
    };
  }

  async getWorkspace(profileId: string, organizationId: string | null) {
    assertContext(profileId, organizationId);
    return this.getStudentWorkspaceSummary(profileId, organizationId);
  }
}
