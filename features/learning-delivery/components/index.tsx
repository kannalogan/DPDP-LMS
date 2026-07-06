import { ArrowLeft, ArrowRight, BookOpen, Clock3, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type {
  CourseCatalogFilters,
  CourseCatalogItem,
  DeliveryModuleSummary,
  DeliveryResource,
  LessonNavigationTarget,
  StudentCourseDetail,
  StudentLessonDetail
} from "@/features/learning-delivery/types";
import {
  CourseStartButton,
  LessonBookmarkButton,
  LessonCompletionButton,
  LessonNotesPanel,
  LessonProgressControl,
  LessonStartButton,
  ResourceBookmarkButton
} from "@/features/learning-delivery/components/delivery-actions";
import { Button } from "@/shared/ui/button";
import { Card, MarkdownRenderer } from "@/shared/ui/data-display";
import { Badge, EmptyState, Progress, ProgressRing } from "@/shared/ui/feedback";
import { SearchInput, Select } from "@/shared/ui/forms";

export function LearningBreadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Learning breadcrumb" className="learning-breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href as Route}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CourseEmptyState({
  description = "No published courses are available for this organization."
}: {
  description?: string;
}) {
  return <EmptyState description={description} title="No courses" />;
}

export function LessonUnavailableState() {
  return (
    <EmptyState
      description="This lesson is unpublished, locked, outside your enrollment, or no longer available."
      title="Lesson unavailable"
    />
  );
}

function CatalogCard({ course }: { course: CourseCatalogItem }) {
  return (
    <Card className="delivery-course-card">
      <div className="student-card-heading">
        <span className="student-eyebrow">{course.track}</span>
        <Badge
          tone={
            course.status === "completed"
              ? "success"
              : course.status === "in_progress"
                ? "info"
                : "neutral"
          }
        >
          {course.status.replace("_", " ")}
        </Badge>
      </div>
      <h2>{course.title}</h2>
      <p>{course.description}</p>
      <div className="delivery-meta">
        <span>{course.difficulty}</span>
        <span>{course.locale}</span>
        {course.category ? <span>{course.category}</span> : null}
      </div>
      <Progress label="Course progress" value={course.progress} />
      <Button asChild>
        <Link href={`/student/courses/${course.slug}` as Route}>
          {course.status === "in_progress" ? "Continue" : "View course"}
        </Link>
      </Button>
    </Card>
  );
}

export function CourseCatalogView({
  courses,
  filters
}: {
  courses: CourseCatalogItem[];
  filters: CourseCatalogFilters;
}) {
  const categories = Array.from(new Set(courses.flatMap((course) => course.category ?? []))).sort();
  const tracks = Array.from(new Set(courses.map((course) => course.track))).sort();
  return (
    <div className="delivery-catalog">
      <form action="/student/courses" className="delivery-filter-bar" method="get" role="search">
        <SearchInput
          aria-label="Search courses"
          defaultValue={filters.query}
          name="q"
          placeholder="Search courses"
        />
        <Select aria-label="Filter by track" defaultValue={filters.track ?? ""} name="track">
          <option value="">All tracks</option>
          {tracks.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          defaultValue={filters.category ?? ""}
          name="category"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select aria-label="Filter by status" defaultValue={filters.status ?? "all"} name="status">
          <option value="all">All statuses</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </Select>
        <Button type="submit">Apply</Button>
      </form>
      {courses.length ? (
        <div className="delivery-course-grid">
          {courses.map((course) => (
            <CatalogCard course={course} key={course.courseId} />
          ))}
        </div>
      ) : (
        <CourseEmptyState />
      )}
    </div>
  );
}

export function CourseDetailHeader({ course }: { course: StudentCourseDetail }) {
  return (
    <header className="delivery-course-header">
      <div>
        <span className="student-eyebrow">{course.track}</span>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div className="delivery-meta">
          <Badge>{course.difficulty}</Badge>
          <span>{course.locale}</span>
          <span>{course.estimatedMinutes} min</span>
          {course.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>
      <ProgressRing label="Course progress" size="lg" value={course.progress} />
    </header>
  );
}

export function CourseProgressPanel({ course }: { course: StudentCourseDetail }) {
  const first = course.modules
    .flatMap((module) => module.lessons)
    .find((lesson) => !lesson.completed && !lesson.locked);
  return (
    <Card className="delivery-progress-panel">
      <h2>Your progress</h2>
      <Progress label="Course completion" value={course.progress} />
      {first && course.enrollmentId && course.status === "in_progress" ? (
        <Button asChild>
          <Link href={`/student/courses/${course.slug}/lessons/${first.slug}` as Route}>
            Resume lesson
          </Link>
        </Button>
      ) : (
        <CourseStartButton
          courseSlug={course.slug}
          enrollmentId={course.enrollmentId}
          resume={course.status === "paused"}
        />
      )}
    </Card>
  );
}

export function ModuleCard({
  courseSlug,
  module
}: {
  courseSlug: string;
  module: DeliveryModuleSummary;
}) {
  return (
    <Card className="delivery-module-card">
      <div className="student-card-heading">
        <span className="student-eyebrow">Module {module.position}</span>
        {module.locked ? (
          <Lock aria-label="Locked" />
        ) : (
          <Badge tone={module.progress === 100 ? "success" : "neutral"}>{module.progress}%</Badge>
        )}
      </div>
      <h3>{module.title}</h3>
      <Progress label={`${module.title} progress`} value={module.progress} />
      {module.locked ? (
        <Button disabled variant="secondary">
          <Lock />
          Locked
        </Button>
      ) : (
        <Button asChild variant="secondary">
          <Link href={`/student/courses/${courseSlug}/modules/${module.moduleId}` as Route}>
            View module
          </Link>
        </Button>
      )}
    </Card>
  );
}

export function ModuleOutline({
  courseSlug,
  modules
}: {
  courseSlug: string;
  modules: DeliveryModuleSummary[];
}) {
  return (
    <div className="delivery-module-outline">
      {modules.map((module) => (
        <ModuleCard courseSlug={courseSlug} key={module.moduleId} module={module} />
      ))}
    </div>
  );
}

export function LessonList({
  courseSlug,
  enrollmentId,
  lessons
}: {
  courseSlug: string;
  enrollmentId: string | null;
  lessons: DeliveryModuleSummary["lessons"];
}) {
  return (
    <ol className="delivery-lesson-list">
      {lessons.map((lesson) => (
        <li key={lesson.lessonId}>
          <div>
            <span className="delivery-lesson-position">{lesson.position}</span>
            <div>
              <strong>{lesson.title}</strong>
              <small>
                <Clock3 />
                {lesson.estimatedMinutes} min · {lesson.type}
              </small>
            </div>
          </div>
          {lesson.locked ? (
            <Lock aria-label="Locked" />
          ) : enrollmentId ? (
            <LessonStartButton
              courseSlug={courseSlug}
              enrollmentId={enrollmentId}
              lessonId={lesson.lessonId}
              lessonSlug={lesson.slug}
            />
          ) : (
            <Badge>Enrollment required</Badge>
          )}
        </li>
      ))}
    </ol>
  );
}

export function LessonReader({ lesson }: { lesson: StudentLessonDetail }) {
  return (
    <article className="delivery-reader">
      <header>
        <span className="student-eyebrow">{lesson.type}</span>
        <h1>{lesson.title}</h1>
        <div className="delivery-meta">
          <span>
            <Clock3 />
            {lesson.estimatedMinutes} min
          </span>
          {lesson.lastViewedAt ? (
            <time dateTime={lesson.lastViewedAt}>
              Last viewed {new Date(lesson.lastViewedAt).toLocaleString()}
            </time>
          ) : null}
        </div>
      </header>
      {lesson.type === "video" ? (
        <div className="delivery-video-foundation" role="status">
          <PlayCircle />
          <span>Video delivery will use the approved resource attachment below.</span>
        </div>
      ) : null}
      <MarkdownRenderer content={lesson.bodyMarkdown} />
    </article>
  );
}

export function LessonNavigation({
  courseSlug,
  navigation
}: {
  courseSlug: string;
  navigation: { next: LessonNavigationTarget | null; previous: LessonNavigationTarget | null };
}) {
  const link = (target: LessonNavigationTarget, direction: "previous" | "next") => (
    <Button asChild variant="secondary">
      <Link href={`/student/courses/${courseSlug}/lessons/${target.slug}` as Route}>
        {direction === "previous" ? <ArrowLeft /> : null}
        <span>
          <small>{direction}</small>
          {target.title}
        </span>
        {direction === "next" ? <ArrowRight /> : null}
      </Link>
    </Button>
  );
  return (
    <nav aria-label="Lesson navigation" className="delivery-lesson-navigation">
      {navigation.previous ? link(navigation.previous, "previous") : <span />}
      {navigation.next ? link(navigation.next, "next") : <span />}
    </nav>
  );
}

export function LessonResourceList({
  courseSlug,
  lessonSlug,
  resources
}: {
  courseSlug: string;
  lessonSlug: string;
  resources: DeliveryResource[];
}) {
  return (
    <section className="delivery-resources">
      <h2>Resources</h2>
      {resources.length ? (
        <ul>
          {resources.map((resource) => (
            <li key={resource.resourceVersionId}>
              <BookOpen />{" "}
              <span>
                <strong>{resource.title}</strong>
                <small>{resource.kind}</small>
              </span>
              <ResourceBookmarkButton
                bookmarked={resource.bookmarked}
                courseSlug={courseSlug}
                lessonSlug={lessonSlug}
                resourceVersionId={resource.resourceVersionId}
              />
              {resource.href ? (
                <Button asChild size="sm" variant="secondary">
                  <a href={resource.href} rel="noreferrer">
                    Open
                  </a>
                </Button>
              ) : (
                <Badge tone="warning">Unavailable</Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState description="No resources are attached to this content." title="No resources" />
      )}
    </section>
  );
}

export function ContinueLearningBanner({ children }: { children: ReactNode }) {
  return (
    <section className="delivery-continue-banner">
      <div>
        <span className="student-eyebrow">Continue learning</span>
        <h2>Pick up where you stopped</h2>
      </div>
      {children}
    </section>
  );
}

export { LessonBookmarkButton, LessonCompletionButton, LessonNotesPanel, LessonProgressControl };
