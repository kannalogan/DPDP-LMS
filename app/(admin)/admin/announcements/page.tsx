import {
  AdminPageHeader,
  AdminPermissionDenied,
  AnnouncementManager
} from "@/features/admin/components";
import { canAccessAdminWorkspace, getAdminWorkspace } from "@/features/admin/server";
import { BroadcastManager } from "@/features/notifications/components";
import {
  canAccessNotifications,
  getNotificationOrganizationId,
  getNotificationWorkspace
} from "@/features/notifications/server";

export default async function AdminAnnouncementsPage() {
  if (!(await canAccessAdminWorkspace())) return <AdminPermissionDenied />;
  const [data, communicationData, organizationId] = await Promise.all([
    getAdminWorkspace(),
    getNotificationWorkspace(true),
    getNotificationOrganizationId(true)
  ]);
  return (
    <>
      <AdminPageHeader
        description="Publish and archive platform announcements for administrative audiences."
        title="Announcements"
      />
      <AnnouncementManager announcements={data?.announcements ?? []} />
      {organizationId && (await canAccessNotifications(true)) ? (
        <BroadcastManager
          announcements={communicationData?.announcements ?? []}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}
