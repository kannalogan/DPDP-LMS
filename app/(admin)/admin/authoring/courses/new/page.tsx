import {
  AssetManager,
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  CategoryManager,
  MetadataEditor,
  TagManager
} from "@/features/course-authoring/components";
import { canAccessAuthoringWorkspace } from "@/features/course-authoring/server";

export default async function NewCourseDraftPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  const draft = {
    courseId: null,
    draftId: "new",
    lessonCount: 0,
    moduleCount: 0,
    openReviews: 0,
    organizationId: null,
    ownerProfileId: "current",
    publishedAt: null,
    scheduledPublishAt: null,
    slug: "new-course",
    title: "New course draft",
    trackId: "pending",
    updatedAt: new Date(0).toISOString(),
    visibility: "organization",
    workflowState: "draft" as const
  };
  return (
    <>
      <AuthoringPageHeader
        description="Create a course draft through the controlled authoring RPC and publish workflow."
        title="New course"
      />
      <MetadataEditor course={draft} />
      <div className="authoring-grid">
        <CategoryManager />
        <TagManager />
        <AssetManager />
      </div>
    </>
  );
}
