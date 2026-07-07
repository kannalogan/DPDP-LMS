import {
  AdminPageHeader,
  AdminPermissionDenied,
  AnnouncementManager
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";

export default async function AdminAnnouncementsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const data = await getAdminWorkspace();
  return (
    <>
      <AdminPageHeader
        description="Publish and archive platform announcements for administrative audiences."
        title="Announcements"
      />
      <AnnouncementManager announcements={data?.announcements ?? []} />
    </>
  );
}
