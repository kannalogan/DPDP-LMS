import type { NotificationInboxItem } from "@/features/notifications/types";
export function buildDigestPreview(items: NotificationInboxItem[], limit = 20) {
  return items
    .filter((item) => !item.readAt && item.folder === "inbox")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
