import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  ContentTree,
  CourseEditor,
  LessonEditor,
  ModuleEditor
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringCourse
} from "@/features/course-authoring/server";

export default async function CourseDraftPage({
  params
}: {
  params: Promise<{ courseId: string }>;
}) {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const { courseId } = await params;
  const course = await getAuthoringCourse(courseId);
  return (
    <>
      <AuthoringPageHeader
        description="Edit metadata, structure, lessons, assets, locking state and publish readiness."
        title={course?.title ?? "Course draft"}
      />
      <CourseEditor course={course} />
      <div className="authoring-grid">
        <ContentTree course={course} />
        <ModuleEditor course={course} />
        <LessonEditor course={course} />
      </div>
    </>
  );
}
