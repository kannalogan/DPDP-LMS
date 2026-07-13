import type {
  CommunicationAnnouncement,
  DeliveryMetric,
  NotificationActionDto,
  NotificationInboxItem,
  NotificationPreference,
  NotificationSchedule,
  NotificationTemplate
} from "@/features/notifications/types";

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);

export function mapNotification(row: Row): NotificationInboxItem {
  const actions = Array.isArray(row.actions) ? row.actions : [];
  return {
    actions: actions.map((action) => {
      const item = action as Row;
      return { key: text(item.key), label: text(item.label), path: nullableText(item.path) };
    }) satisfies NotificationActionDto[],
    createdAt: text(row.created_at),
    folder: text(row.folder, "inbox") as NotificationInboxItem["folder"],
    id: text(row.notification_id),
    pinned: row.pinned === true,
    priority: text(row.priority, "normal") as NotificationInboxItem["priority"],
    purpose: text(row.purpose),
    readAt: nullableText(row.read_at),
    summary: text(row.summary),
    title: text(row.title, "Notification"),
    type: text(row.type, "transactional")
  };
}
export function mapPreference(row: Row): NotificationPreference {
  return {
    category: nullableText(row.category),
    channel: text(row.channel, "in_app") as NotificationPreference["channel"],
    digestFrequency: text(
      row.digest_frequency,
      "immediate"
    ) as NotificationPreference["digestFrequency"],
    enabled: row.enabled !== false,
    id: text(row.id),
    quietHoursEnd: nullableText(row.quiet_hours_end),
    quietHoursStart: nullableText(row.quiet_hours_start),
    timezone: text(row.timezone, "Asia/Kolkata")
  };
}
export function mapTemplate(row: Row): NotificationTemplate {
  const versions = Array.isArray(row.notification_template_versions)
    ? (row.notification_template_versions as Row[])
    : [];
  const latest = versions.sort(
    (left, right) => Number(right.version ?? 0) - Number(left.version ?? 0)
  )[0];
  return {
    channel: latest ? (text(latest.channel, "in_app") as NotificationTemplate["channel"]) : null,
    id: text(row.id),
    key: text(row.key),
    latestVersionId: latest ? text(latest.id) : null,
    name: text(row.name),
    status: text(row.status),
    updatedAt: text(row.updated_at),
    version: latest ? Number(latest.version ?? 0) : null
  };
}
export function mapSchedule(row: Row): NotificationSchedule {
  return {
    id: text(row.id),
    notificationId: text(row.notification_id),
    recurrenceRule: nullableText(row.recurrence_rule),
    scheduledFor: text(row.scheduled_for),
    status: text(row.status)
  };
}
export function mapAnnouncement(row: Row): CommunicationAnnouncement {
  return {
    body: text(row.body),
    expiresAt: nullableText(row.expires_at),
    id: text(row.message_id),
    priority: text(row.priority, "normal") as CommunicationAnnouncement["priority"],
    publishAt: text(row.publish_at),
    title: text(row.title)
  };
}
export function mapDelivery(row: Row): DeliveryMetric {
  return {
    channel: text(row.channel),
    count: Number(row.delivery_count ?? 0),
    date: text(row.activity_date),
    status: text(row.status)
  };
}
