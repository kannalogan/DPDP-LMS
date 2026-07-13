import type {
  NotificationChannel,
  NotificationPreference,
  NotificationPriority
} from "@/features/notifications/types";
export function preferenceAllows(
  preferences: NotificationPreference[],
  channel: NotificationChannel,
  priority: NotificationPriority,
  now = new Date()
) {
  void priority;
  const preference = preferences.find((item) => item.channel === channel);
  if (!preference || !preference.enabled || preference.digestFrequency === "never") return false;
  if (!preference.quietHoursStart || !preference.quietHoursEnd || priority === "critical")
    return true;
  const current = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: preference.timezone
  });
  return preference.quietHoursStart < preference.quietHoursEnd
    ? current < preference.quietHoursStart || current >= preference.quietHoursEnd
    : current >= preference.quietHoursEnd && current < preference.quietHoursStart;
}
