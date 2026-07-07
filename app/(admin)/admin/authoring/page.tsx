import {
  AuthoringDashboard,
  AuthoringEmpty,
  AuthoringPageHeader,
  AuthoringPermissionDenied
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function AdminAuthoringPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Manage draft courses, reviews, resource library, publishing readiness and release workflow."
        title="Authoring dashboard"
      />
      {data.courses.length || data.reviews.length || data.resources.length ? (
        <AuthoringDashboard data={data} />
      ) : (
        <AuthoringEmpty />
      )}
    </>
  );
}
