import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  PublishingQueue
} from "@/features/course-authoring/components";
import {
  canAccessAuthoringWorkspace,
  getAuthoringWorkspace
} from "@/features/course-authoring/server";

export default async function AuthoringPublishingPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const data = await getAuthoringWorkspace();
  if (!data) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Review scheduled publication jobs, errors, and publication workflow state."
        title="Publishing"
      />
      <PublishingQueue items={data.publishingQueue} />
    </>
  );
}
