import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { z } from "zod";
import {
  LearningBreadcrumb,
  LessonList,
  LessonResourceList
} from "@/features/learning-delivery/components";
import {
  canAccessLearningDelivery,
  getStudentModuleDetail
} from "@/features/learning-delivery/server";
import { StudentPermissionError } from "@/features/student/components";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/feedback";

export default async function ModuleDetailPage({
  params
}: {
  params: Promise<{ courseSlug: string; moduleId: string }>;
}) {
  const { courseSlug, moduleId } = await params;
  if (!(await canAccessLearningDelivery())) return <StudentPermissionError />;
  if (!z.string().uuid().safeParse(moduleId).success) notFound();
  const detail = await getStudentModuleDetail(courseSlug, moduleId);
  if (!detail || detail.module.locked) notFound();
  return (
    <div className="student-workspace">
      <LearningBreadcrumb
        items={[
          { href: "/student/courses", label: "Courses" },
          { href: `/student/courses/${courseSlug}`, label: detail.course.title },
          { label: detail.module.title }
        ]}
      />
      <header className="student-page-header">
        <div>
          <span className="student-eyebrow">Module {detail.module.position}</span>
          <h1>{detail.module.title}</h1>
          <p>Follow the published lesson sequence and keep progress synchronized.</p>
        </div>
        <div className="delivery-module-progress">
          <Progress label="Module progress" value={detail.module.progress} />
        </div>
      </header>
      <section className="delivery-completion-rule">
        <strong>Completion requirement</strong>
        <p>
          {Object.keys(detail.module.completionRule).length
            ? JSON.stringify(detail.module.completionRule)
            : "Complete every published lesson in sequence."}
        </p>
      </section>
      <LessonList
        courseSlug={courseSlug}
        enrollmentId={detail.course.enrollmentId}
        lessons={detail.module.lessons}
      />
      <nav aria-label="Module lesson shortcuts" className="delivery-module-navigation">
        {detail.previousLesson ? (
          <Button asChild variant="secondary">
            <Link
              href={`/student/courses/${courseSlug}/lessons/${detail.previousLesson.slug}` as Route}
            >
              Previous completed lesson
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {detail.nextLesson ? (
          <Button asChild>
            <Link
              href={`/student/courses/${courseSlug}/lessons/${detail.nextLesson.slug}` as Route}
            >
              Next lesson
            </Link>
          </Button>
        ) : null}
      </nav>
      <LessonResourceList
        courseSlug={courseSlug}
        lessonSlug="module"
        resources={detail.resources}
      />
    </div>
  );
}
