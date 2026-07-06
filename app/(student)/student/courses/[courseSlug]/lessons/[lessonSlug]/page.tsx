import {
  LessonBookmarkButton,
  LessonCompletionButton,
  LessonNavigation,
  LessonNotesPanel,
  LessonProgressControl,
  LessonReader,
  LessonResourceList,
  LessonUnavailableState,
  LearningBreadcrumb
} from "@/features/learning-delivery/components";
import {
  canAccessLearningDelivery,
  getStudentLessonDetail
} from "@/features/learning-delivery/server";
import { StudentPermissionError } from "@/features/student/components";

export default async function LessonDetailPage({
  params
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  if (!(await canAccessLearningDelivery())) return <StudentPermissionError />;
  const lesson = await getStudentLessonDetail(courseSlug, lessonSlug);
  if (!lesson || !lesson.course.enrollmentId) return <LessonUnavailableState />;
  return (
    <div className="student-workspace">
      <LearningBreadcrumb
        items={[
          { href: "/student/courses", label: "Courses" },
          { href: `/student/courses/${courseSlug}`, label: lesson.course.title },
          {
            href: `/student/courses/${courseSlug}/modules/${lesson.module.moduleId}`,
            label: lesson.module.title
          },
          { label: lesson.title }
        ]}
      />
      <div className="delivery-lesson-layout">
        <main>
          <LessonReader lesson={lesson} />
          <LessonResourceList
            courseSlug={courseSlug}
            lessonSlug={lessonSlug}
            resources={lesson.resources}
          />
          <LessonNavigation courseSlug={courseSlug} navigation={lesson.navigation} />
        </main>
        <aside className="delivery-lesson-tools">
          <div className="delivery-lesson-actions">
            <LessonBookmarkButton
              bookmarked={lesson.bookmarked}
              courseSlug={courseSlug}
              lessonId={lesson.lessonId}
              lessonSlug={lessonSlug}
            />
            <LessonCompletionButton
              completed={lesson.progress === 100}
              courseSlug={courseSlug}
              enrollmentId={lesson.course.enrollmentId}
              lessonId={lesson.lessonId}
              lessonSlug={lessonSlug}
            />
          </div>
          <LessonProgressControl
            courseSlug={courseSlug}
            enrollmentId={lesson.course.enrollmentId}
            lessonId={lesson.lessonId}
            lessonSlug={lessonSlug}
            progress={lesson.progress}
          />
          <LessonNotesPanel
            available={lesson.notesAvailable}
            courseSlug={courseSlug}
            lessonId={lesson.lessonId}
            lessonSlug={lessonSlug}
            notes={lesson.notes}
            reason={lesson.notesUnavailableReason}
          />
        </aside>
      </div>
    </div>
  );
}
