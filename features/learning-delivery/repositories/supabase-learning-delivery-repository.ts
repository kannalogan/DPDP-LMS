import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import { decryptEnvelope, requireNoteEncryptionKey } from "@/lib/security/envelope";
import type {
  CourseCatalogFilters,
  CourseCatalogItem,
  DeliveryLessonSummary,
  DeliveryModuleSummary,
  DeliveryResource,
  DeliveryStatus,
  LessonNotesView,
  StudentCourseDetail,
  StudentLessonDetail,
  StudentModuleDetail
} from "@/features/learning-delivery/types";

export type CatalogRow = {
  course:
    | {
        category: { name: string } | Array<{ name: string }> | null;
        id: string;
        organization_id: string | null;
        slug: string;
        track: { name: string } | Array<{ name: string }>;
      }
    | Array<{
        category: { name: string } | Array<{ name: string }> | null;
        id: string;
        organization_id: string | null;
        slug: string;
        track: { name: string } | Array<{ name: string }>;
      }>;
  course_id: string;
  description: string;
  difficulty: string;
  id: string;
  locale: string;
  outcomes: unknown;
  title: string;
};

type EnrollmentRow = {
  course_version_id: string | null;
  id: string;
  status: string;
};

type ProgressRow = { enrollment_id: string; progress: number | string; status: string };

type ModuleRow = {
  completion_rule: unknown;
  id: string;
  position: number;
  title: string;
};

type LessonRow = {
  course_module_id: string;
  id: string;
  position: number;
  slug: string;
  type: string;
};
type LessonVersionRow = {
  body: unknown;
  estimated_seconds: number;
  lesson_id: string;
  title: string;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function deliveryStatus(enrollment?: EnrollmentRow, progress?: ProgressRow): DeliveryStatus {
  if (progress?.status === "completed" || enrollment?.status === "completed") return "completed";
  if (enrollment?.status === "paused") return "paused";
  if (progress?.status === "in_progress" || enrollment?.status === "active") return "in_progress";
  return "not_started";
}

function fail(operation: string, error: { message: string } | null) {
  if (error)
    throw new AppError("INTERNAL_SERVER_ERROR", `Unable to ${operation}`, { cause: error.message });
}

export function mapPublishedLessonBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  if (typeof record.markdown === "string") return record.markdown;
  if (record.format === "markdown" && typeof record.content === "string") return record.content;
  if (typeof record.content === "string") return record.content;
  return "";
}

function outcomes(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function mapCatalogCourse(
  row: CatalogRow,
  enrollment?: EnrollmentRow,
  progress?: ProgressRow
): CourseCatalogItem | null {
  const course = one(row.course);
  if (!course) return null;
  return {
    category: one(course.category)?.name ?? null,
    courseId: row.course_id,
    description: row.description,
    difficulty: row.difficulty,
    enrollmentId: enrollment?.id ?? null,
    locale: row.locale,
    progress: numeric(progress?.progress),
    slug: course.slug,
    status: deliveryStatus(enrollment, progress),
    title: row.title,
    track: one(course.track)?.name ?? "Learning"
  };
}

export class SupabaseLearningDeliveryRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly profileId: string,
    private readonly organizationId: string
  ) {}

  private async catalogRows(courseSlug?: string) {
    let query = this.client
      .from("course_versions")
      .select(
        "id,course_id,title,description,locale,difficulty,outcomes,course:courses!inner(id,organization_id,slug,category:course_categories(name),track:learning_tracks!inner(name))"
      )
      .eq("status", "published")
      .eq("course.status", "published")
      .order("published_at", { ascending: false })
      .limit(courseSlug ? 4 : 100);
    if (courseSlug) query = query.eq("course.slug", courseSlug);
    const { data, error } = await query;
    fail("load published courses", error);
    return (data ?? []) as unknown as CatalogRow[];
  }

  private async enrollmentProjection(versionIds: string[]) {
    if (!versionIds.length)
      return {
        enrollments: new Map<string, EnrollmentRow>(),
        progress: new Map<string, ProgressRow>()
      };
    const { data, error } = await this.client
      .from("enrollments")
      .select("id,course_version_id,status")
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .in("course_version_id", versionIds)
      .is("archived_at", null);
    fail("load course enrollments", error);
    const enrollmentRows = (data ?? []) as EnrollmentRow[];
    const enrollmentIds = enrollmentRows.map((item) => item.id);
    const progressRows = enrollmentIds.length
      ? await this.client
          .from("course_progress")
          .select("enrollment_id,status,progress")
          .in("enrollment_id", enrollmentIds)
      : { data: [], error: null };
    fail("load course progress", progressRows.error);
    return {
      enrollments: new Map(
        enrollmentRows.flatMap((item) =>
          item.course_version_id ? [[item.course_version_id, item] as const] : []
        )
      ),
      progress: new Map(
        ((progressRows.data ?? []) as ProgressRow[]).map((item) => [item.enrollment_id, item])
      )
    };
  }

  async getStudentCourseCatalog(filters: CourseCatalogFilters = {}): Promise<CourseCatalogItem[]> {
    const rows = await this.catalogRows();
    const projection = await this.enrollmentProjection(rows.map((item) => item.id));
    const query = filters.query?.trim().toLocaleLowerCase() ?? "";
    return rows.flatMap((row) => {
      const enrollment = projection.enrollments.get(row.id);
      const progress = enrollment ? projection.progress.get(enrollment.id) : undefined;
      const item = mapCatalogCourse(row, enrollment, progress);
      if (!item) return [];
      if (query && !`${item.title} ${item.description}`.toLocaleLowerCase().includes(query))
        return [];
      if (filters.category && item.category !== filters.category) return [];
      if (filters.track && item.track !== filters.track) return [];
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return [];
      return [item];
    });
  }

  async getStudentCourseDetail(courseSlug: string): Promise<StudentCourseDetail | null> {
    const rows = await this.catalogRows(courseSlug);
    const row = rows.sort((left, right) => {
      const leftOrg = one(left.course)?.organization_id === this.organizationId ? 0 : 1;
      const rightOrg = one(right.course)?.organization_id === this.organizationId ? 0 : 1;
      return leftOrg - rightOrg;
    })[0];
    if (!row) return null;
    const course = one(row.course);
    if (!course) return null;
    const projection = await this.enrollmentProjection([row.id]);
    const enrollment = projection.enrollments.get(row.id);
    const courseProgress = enrollment ? projection.progress.get(enrollment.id) : undefined;

    const [{ data: moduleData, error: moduleError }, { data: tagData, error: tagError }] =
      await Promise.all([
        this.client
          .from("course_modules")
          .select("id,title,position,completion_rule")
          .eq("course_version_id", row.id)
          .is("archived_at", null)
          .order("position"),
        this.client.from("course_tags").select("tag:tags(label)").eq("course_id", row.course_id)
      ]);
    fail("load course modules", moduleError);
    fail("load course tags", tagError);
    const modules = (moduleData ?? []) as ModuleRow[];
    const moduleIds = modules.map((item) => item.id);
    const lessonResult = moduleIds.length
      ? await this.client
          .from("lessons")
          .select("id,course_module_id,slug,position,type")
          .in("course_module_id", moduleIds)
          .is("archived_at", null)
          .order("position")
      : { data: [], error: null };
    fail("load course lessons", lessonResult.error);
    const lessons = (lessonResult.data ?? []) as LessonRow[];
    const lessonIds = lessons.map((item) => item.id);
    const [versionsResult, lessonProgressResult, moduleProgressResult, resources] =
      await Promise.all([
        lessonIds.length
          ? this.client
              .from("lesson_versions")
              .select("lesson_id,title,body,estimated_seconds")
              .in("lesson_id", lessonIds)
              .eq("status", "published")
          : Promise.resolve({ data: [], error: null }),
        enrollment && lessonIds.length
          ? this.client
              .from("lesson_progress")
              .select("lesson_id,status,progress,last_activity_at")
              .eq("enrollment_id", enrollment.id)
              .in("lesson_id", lessonIds)
          : Promise.resolve({ data: [], error: null }),
        enrollment && moduleIds.length
          ? this.client
              .from("module_progress")
              .select("module_id,status,progress")
              .eq("enrollment_id", enrollment.id)
              .in("module_id", moduleIds)
          : Promise.resolve({ data: [], error: null }),
        this.getLessonResources({ courseVersionId: row.id })
      ]);
    fail("load lesson versions", versionsResult.error);
    fail("load lesson progress", lessonProgressResult.error);
    fail("load module progress", moduleProgressResult.error);
    const versions = new Map(
      ((versionsResult.data ?? []) as LessonVersionRow[]).map((item) => [item.lesson_id, item])
    );
    const lessonProgress = new Map(
      (
        (lessonProgressResult.data ?? []) as Array<{
          lesson_id: string;
          progress: number | string;
          status: string;
        }>
      ).map((item) => [item.lesson_id, item])
    );
    const moduleProgress = new Map(
      (
        (moduleProgressResult.data ?? []) as Array<{ module_id: string; progress: number | string }>
      ).map((item) => [item.module_id, item])
    );
    const moduleDtos: DeliveryModuleSummary[] = modules.map((module, moduleIndex) => ({
      completionRule:
        module.completion_rule && typeof module.completion_rule === "object"
          ? (module.completion_rule as Record<string, unknown>)
          : {},
      lessons: lessons
        .filter((lesson) => lesson.course_module_id === module.id)
        .map((lesson) => {
          const version = versions.get(lesson.id);
          const progress = lessonProgress.get(lesson.id);
          return {
            completed: progress?.status === "completed",
            estimatedMinutes: Math.ceil((version?.estimated_seconds ?? 0) / 60),
            lessonId: lesson.id,
            locked:
              moduleIndex > 0 &&
              numeric(moduleProgress.get(modules[moduleIndex - 1]?.id ?? "")?.progress) < 100,
            position: lesson.position,
            progress: numeric(progress?.progress),
            slug: lesson.slug,
            title: version?.title ?? "Unavailable lesson",
            type: lesson.type
          } satisfies DeliveryLessonSummary;
        }),
      locked:
        moduleIndex > 0 &&
        numeric(moduleProgress.get(modules[moduleIndex - 1]?.id ?? "")?.progress) < 100,
      moduleId: module.id,
      position: module.position,
      progress: numeric(moduleProgress.get(module.id)?.progress),
      title: module.title
    }));
    return {
      category: one(course.category)?.name ?? null,
      courseId: row.course_id,
      courseVersionId: row.id,
      description: row.description,
      difficulty: row.difficulty,
      enrollmentId: enrollment?.id ?? null,
      estimatedMinutes: Array.from(versions.values()).reduce(
        (total, item) => total + Math.ceil(item.estimated_seconds / 60),
        0
      ),
      locale: row.locale,
      modules: moduleDtos,
      outcomes: outcomes(row.outcomes),
      progress: numeric(courseProgress?.progress),
      resources,
      slug: course.slug,
      status: deliveryStatus(enrollment, courseProgress),
      tags: (tagData ?? []).flatMap((item) => {
        const tag = one(
          (item as unknown as { tag: { label: string } | Array<{ label: string }> }).tag
        );
        return tag ? [tag.label] : [];
      }),
      title: row.title,
      track: one(course.track)?.name ?? "Learning"
    };
  }

  async getStudentModuleDetail(
    courseSlug: string,
    moduleId: string
  ): Promise<StudentModuleDetail | null> {
    const course = await this.getStudentCourseDetail(courseSlug);
    if (!course) return null;
    const moduleIndex = course.modules.findIndex((item) => item.moduleId === moduleId);
    if (moduleIndex < 0) return null;
    const courseModule = course.modules[moduleIndex]!;
    return {
      course,
      module: courseModule,
      nextLesson: courseModule.lessons.find((item) => !item.completed && !item.locked) ?? null,
      previousLesson: [...courseModule.lessons].reverse().find((item) => item.completed) ?? null,
      resources: course.resources
    };
  }

  async getLessonNavigation(course: StudentCourseDetail, lessonId: string) {
    const sequence = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({ lesson, module }))
    );
    const index = sequence.findIndex((item) => item.lesson.lessonId === lessonId);
    const map = (item: (typeof sequence)[number] | undefined) =>
      item
        ? { moduleId: item.module.moduleId, slug: item.lesson.slug, title: item.lesson.title }
        : null;
    return { next: map(sequence[index + 1]), previous: map(sequence[index - 1]) };
  }

  async getLessonNotes(lessonId: string): Promise<LessonNotesView> {
    let key: string;
    try {
      key = requireNoteEncryptionKey();
    } catch {
      return {
        available: false,
        items: [],
        reason: "Private learner notes are unavailable until encryption is configured."
      };
    }
    const { data, error } = await this.client
      .from("learner_notes")
      .select("id,body_ciphertext,updated_at")
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .eq("lesson_id", lessonId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    fail("load lesson notes", error);
    try {
      return {
        available: true,
        items: await Promise.all(
          (data ?? []).map(async (item) => ({
            body: await decryptEnvelope(item.body_ciphertext as string, key),
            noteId: item.id as string,
            updatedAt: item.updated_at as string
          }))
        ),
        reason: null
      };
    } catch {
      return {
        available: false,
        items: [],
        reason: "Private learner notes could not be decrypted safely."
      };
    }
  }

  async getLessonBookmarks(lessonId: string) {
    const { data, error } = await this.client
      .from("learner_bookmarks")
      .select("id,position")
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    fail("load lesson bookmark", error);
    return data
      ? {
          bookmarkId: data.id as string,
          position: (data.position ?? {}) as Record<string, unknown>
        }
      : null;
  }

  async getLessonResources(input: {
    courseVersionId?: string;
    lessonVersionId?: string;
  }): Promise<DeliveryResource[]> {
    let query = this.client
      .from("resource_versions")
      .select(
        "id,external_url,storage_type,resource:learning_resources!inner(id,title,kind,course_version_id,lesson_version_id),storage_object:storage_objects(bucket,object_path)"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (input.courseVersionId)
      query = query.eq("resource.course_version_id", input.courseVersionId);
    if (input.lessonVersionId)
      query = query.eq("resource.lesson_version_id", input.lessonVersionId);
    const { data, error } = await query.limit(100);
    fail("load lesson resources", error);
    const rows = await Promise.all(
      (data ?? []).map(async (raw) => {
        const row = raw as unknown as {
          external_url: string | null;
          id: string;
          resource:
            | { id: string; kind: string; title: string }
            | Array<{ id: string; kind: string; title: string }>;
          storage_object:
            | { bucket: string; object_path: string }
            | Array<{ bucket: string; object_path: string }>
            | null;
        };
        const resource = one(row.resource);
        if (!resource) return null;
        const storage = one(row.storage_object);
        let href = row.external_url;
        if (!href && storage) {
          const signed = await this.client.storage
            .from(storage.bucket)
            .createSignedUrl(storage.object_path, 300);
          href = signed.data?.signedUrl ?? null;
        }
        return {
          href,
          kind: resource.kind,
          resourceId: resource.id,
          resourceVersionId: row.id,
          title: resource.title
        };
      })
    );
    const resources = rows.filter((item): item is NonNullable<typeof item> => item !== null);
    if (!resources.length) return [];
    const { data: bookmarks, error: bookmarkError } = await this.client
      .from("learner_bookmarks")
      .select("resource_version_id")
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .in(
        "resource_version_id",
        resources.map((item) => item.resourceVersionId)
      );
    fail("load resource bookmarks", bookmarkError);
    const bookmarked = new Set((bookmarks ?? []).map((item) => item.resource_version_id as string));
    return resources.map((item) => ({
      ...item,
      bookmarked: bookmarked.has(item.resourceVersionId)
    }));
  }

  async getStudentLessonDetail(
    courseSlug: string,
    lessonSlug: string
  ): Promise<StudentLessonDetail | null> {
    const course = await this.getStudentCourseDetail(courseSlug);
    if (!course) return null;
    const courseModule = course.modules.find((item) =>
      item.lessons.some((lesson) => lesson.slug === lessonSlug)
    );
    const lesson = courseModule?.lessons.find((item) => item.slug === lessonSlug);
    if (!courseModule || !lesson || lesson.locked) return null;
    const { data: version, error } = await this.client
      .from("lesson_versions")
      .select("id,title,body,estimated_seconds")
      .eq("lesson_id", lesson.lessonId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail("load lesson content", error);
    if (!version) return null;
    const [notes, bookmark, resources, navigation] = await Promise.all([
      this.getLessonNotes(lesson.lessonId),
      this.getLessonBookmarks(lesson.lessonId),
      this.getLessonResources({ lessonVersionId: version.id as string }),
      this.getLessonNavigation(course, lesson.lessonId)
    ]);
    const progressRow = course.enrollmentId
      ? await this.client
          .from("lesson_progress")
          .select("progress,last_activity_at")
          .eq("enrollment_id", course.enrollmentId)
          .eq("lesson_id", lesson.lessonId)
          .maybeSingle()
      : { data: null, error: null };
    fail("load lesson resume state", progressRow.error);
    return {
      bodyMarkdown: mapPublishedLessonBody(version.body),
      bookmarked: Boolean(bookmark),
      course: {
        courseId: course.courseId,
        enrollmentId: course.enrollmentId,
        progress: course.progress,
        slug: course.slug,
        title: course.title
      },
      estimatedMinutes: Math.ceil(Number(version.estimated_seconds ?? 0) / 60),
      lastViewedAt: progressRow.data?.last_activity_at ?? null,
      lessonId: lesson.lessonId,
      module: {
        moduleId: courseModule.moduleId,
        position: courseModule.position,
        progress: courseModule.progress,
        title: courseModule.title
      },
      navigation,
      notes: notes.items,
      notesAvailable: notes.available,
      notesUnavailableReason: notes.reason,
      progress: numeric(progressRow.data?.progress),
      resources,
      resumePosition: bookmark?.position ?? {},
      slug: lesson.slug,
      title: version.title as string,
      type: lesson.type
    };
  }

  async getContinueLearningTarget() {
    const catalog = await this.getStudentCourseCatalog({ status: "in_progress" });
    const course = catalog.sort((left, right) => right.progress - left.progress)[0];
    if (!course) return null;
    const detail = await this.getStudentCourseDetail(course.slug);
    const target = detail?.modules
      .flatMap((module) => module.lessons)
      .find((lesson) => !lesson.completed && !lesson.locked);
    return detail && target ? { courseSlug: detail.slug, lessonSlug: target.slug } : null;
  }

  async getCourseProgressProjection(courseSlug: string) {
    const detail = await this.getStudentCourseDetail(courseSlug);
    return detail
      ? {
          courseProgress: detail.progress,
          modules: detail.modules.map((module) => ({
            moduleId: module.moduleId,
            progress: module.progress
          }))
        }
      : null;
  }
}
