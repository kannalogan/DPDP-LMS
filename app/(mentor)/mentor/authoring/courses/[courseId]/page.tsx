import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  ContentTree,
  CourseEditor
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringCourse
} from "@/features/course-authoring/server";

export default async function MentorAuthoringCoursePage({
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
        description="Review course structure, locking state and publishing readiness."
        title={course?.title ?? "Authoring course"}
      />
      <CourseEditor course={course} />
      <ContentTree course={course} />
    </>
  );
}
