import {
  AuthoringPageHeader,
  AuthoringPermissionDenied,
  CategoryManager,
  TagManager
} from "@/features/course-authoring/components";
import { canAccessAuthoringWorkspace } from "@/features/course-authoring/server";

export default async function AuthoringCategoriesPage() {
  if (!(await canAccessAuthoringWorkspace())) return <AuthoringPermissionDenied />;
  return (
    <>
      <AuthoringPageHeader
        description="Organize content categories and labels that map to canonical learning categories and tags."
        title="Categories"
      />
      <div className="authoring-grid">
        <CategoryManager />
        <TagManager />
      </div>
    </>
  );
}
