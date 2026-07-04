import {
  NotificationCard,
  StudentEmpty,
  StudentPageHeader,
  StudentPermissionError,
  StudentServiceNotice
} from "@/features/student/components";
import { requireStudentWorkspace } from "@/features/student/server";

export default async function NotificationsPage() {
  const data = await requireStudentWorkspace();
  if (!data.permissionGranted) return <StudentPermissionError />;
  return (
    <div className="student-workspace">
      <StudentPageHeader
        description="Learning reminders, assessment dates, certificates, mentor feedback, announcements, and recommendations."
        eyebrow="Inbox"
        title="Notifications"
      />
      <StudentServiceNotice reason={data.unavailableReason} status={data.status} />
      {data.notifications.length ? (
        <div className="student-notification-list">
          {data.notifications.map((item) => (
            <NotificationCard key={item.notificationId} notification={item} />
          ))}
        </div>
      ) : (
        <StudentEmpty
          description="Important learning updates will appear here."
          title="No notifications"
        />
      )}
    </div>
  );
}
