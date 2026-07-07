import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  CourseTable
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function MentorAuthoringCoursesPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Open course drafts available for mentor authoring and review."
        title="Authoring courses"
      />
      <CourseTable courses={data.courses} />
    </>
  );
}
