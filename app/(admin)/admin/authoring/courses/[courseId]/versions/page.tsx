import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  VersionHistory,
  WorkflowTimeline
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringCourse
} from "@/features/course-authoring/server";

export default async function CourseVersionsPage({
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
        description="Inspect version history and rollback preparation evidence."
        title="Versions"
      />
      <div className="authoring-grid">
        <VersionHistory course={course} />
        <WorkflowTimeline course={course} />
      </div>
    </>
  );
}
