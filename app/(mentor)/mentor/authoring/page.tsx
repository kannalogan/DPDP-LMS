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

export default async function MentorAuthoringPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Author and review organization-scoped course drafts assigned to your workspace."
        title="Mentor authoring"
      />
      {data.courses.length ? <AuthoringDashboard data={data} /> : <AuthoringEmpty />}
    </>
  );
}
