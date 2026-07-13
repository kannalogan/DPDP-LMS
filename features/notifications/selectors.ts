import type { NotificationInboxItem, NotificationPriority } from "@/features/notifications/types";
export function unreadNotifications(items: NotificationInboxItem[]) {
  return items.filter((item) => !item.readAt && item.folder === "inbox");
}
export function notificationPriorityTone(priority: NotificationPriority) {
  return priority === "critical"
    ? "danger"
    : priority === "high"
      ? "warning"
      : priority === "low"
        ? "neutral"
        : "info";
}
export function formatNotificationDate(value: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Not scheduled";
}
