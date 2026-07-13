import {
  AnnouncementFeed,
  BroadcastManager,
  DeliveryStatus,
  FailureViewer,
  Inbox,
  NotificationCenter,
  NotificationEmpty,
  NotificationPageHeader,
  NotificationPermissionDenied,
  NotificationPreferences,
  ReminderManager,
  TemplateBuilder
} from "@/features/notifications/components";
import {
  canAccessNotifications,
  getNotificationOrganizationId,
  getNotificationWorkspace
} from "@/features/notifications/server";

export type NotificationRouteMode =
  | "center"
  | "inbox"
  | "messages"
  | "templates"
  | "broadcast"
  | "schedules"
  | "history"
  | "preferences";
const copy: Record<NotificationRouteMode, { title: string; description: string }> = {
  center: {
    title: "Notifications",
    description: "Manage workflow updates, reminders, announcements, and communication status."
  },
  inbox: {
    title: "Inbox",
    description: "Review, action, archive, and restore your organization-scoped messages."
  },
  messages: {
    title: "Messages",
    description: "Read active organization announcements and operational messages."
  },
  templates: {
    title: "Notification templates",
    description: "Manage immutable, channel-specific communication template versions."
  },
  broadcast: {
    title: "Broadcast",
    description: "Publish controlled organization announcements without external provider delivery."
  },
  schedules: {
    title: "Schedules",
    description: "Monitor immediate, scheduled, recurring, deadline, and escalation reminders."
  },
  history: {
    title: "Delivery history",
    description: "Inspect immutable channel outcomes and provider-neutral failure evidence."
  },
  preferences: {
    title: "Notification preferences",
    description: "Control channels, quiet hours, digests, priorities, and categories."
  }
};
export async function NotificationRouteView({
  admin = false,
  mode
}: {
  admin?: boolean;
  mode: NotificationRouteMode;
}) {
  if (!(await canAccessNotifications(admin))) return <NotificationPermissionDenied />;
  const [data, organizationId] = await Promise.all([
    getNotificationWorkspace(admin),
    getNotificationOrganizationId(admin)
  ]);
  if (!data || !organizationId) return <NotificationPermissionDenied />;
  const content =
    mode === "center" ? (
      <NotificationCenter data={data} />
    ) : mode === "inbox" ? (
      <Inbox items={data.inbox} />
    ) : mode === "messages" ? (
      <AnnouncementFeed announcements={data.announcements} />
    ) : mode === "templates" ? (
      <TemplateBuilder organizationId={organizationId} templates={data.templates} />
    ) : mode === "broadcast" ? (
      <BroadcastManager announcements={data.announcements} organizationId={organizationId} />
    ) : mode === "schedules" ? (
      <ReminderManager schedules={data.schedules} />
    ) : mode === "history" ? (
      <div className="notification-grid">
        <DeliveryStatus deliveries={data.deliveries} />
        <FailureViewer deliveries={data.deliveries} />
      </div>
    ) : mode === "preferences" ? (
      <NotificationPreferences organizationId={organizationId} preferences={data.preferences} />
    ) : (
      <NotificationEmpty />
    );
  return (
    <>
      <NotificationPageHeader {...copy[mode]} />
      {content}
    </>
  );
}
