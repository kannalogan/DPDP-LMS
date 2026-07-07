import {
  CourseTable,
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  Pagination
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function AdminAuthoringCoursesPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Search and manage course drafts across the approved authoring workflow."
        title="Courses"
      />
      <CourseTable courses={data.courses} />
      <Pagination />
    </>
  );
}
