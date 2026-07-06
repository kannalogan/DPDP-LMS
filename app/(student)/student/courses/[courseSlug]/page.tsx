import { notFound } from "next/navigation";
import {
  CourseDetailHeader,
  CourseProgressPanel,
  LearningBreadcrumb,
  LessonResourceList,
  ModuleOutline
} from "@/features/learning-delivery/components";
import {
  canAccessLearningDelivery,
  getStudentCourseDetail
} from "@/features/learning-delivery/server";
import { StudentPermissionError } from "@/features/student/components";

export default async function CourseDetailPage({
  params
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  if (!(await canAccessLearningDelivery())) return <StudentPermissionError />;
  const course = await getStudentCourseDetail(courseSlug);
  if (!course) notFound();
  return (
    <div className="student-workspace">
      <LearningBreadcrumb
        items={[{ href: "/student/courses", label: "Courses" }, { label: course.title }]}
      />
      <CourseDetailHeader course={course} />
      <div className="delivery-course-layout">
        <main>
          <section className="student-section">
            <header>
              <div>
                <h2>Learning outcomes</h2>
                <p>What this course is designed to help you accomplish.</p>
              </div>
            </header>
            {course.outcomes.length ? (
              <ul className="delivery-outcomes">
                {course.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            ) : (
              <p className="delivery-muted">No outcomes have been published.</p>
            )}
          </section>
          <section className="student-section">
            <header>
              <div>
                <h2>Course modules</h2>
                <p>{course.modules.length} structured modules</p>
              </div>
            </header>
            <ModuleOutline courseSlug={course.slug} modules={course.modules} />
          </section>
          <LessonResourceList
            courseSlug={course.slug}
            lessonSlug="course"
            resources={course.resources}
          />
        </main>
        <aside>
          <CourseProgressPanel course={course} />
        </aside>
      </div>
    </div>
  );
}
