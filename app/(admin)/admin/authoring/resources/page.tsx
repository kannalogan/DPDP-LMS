import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  ResourceLibrary
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function AuthoringResourcesPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Manage approved resource library records for PDFs, downloads, videos, links and embeds."
        title="Resources"
      />
      <ResourceLibrary resources={data.resources} />
    </>
  );
}
