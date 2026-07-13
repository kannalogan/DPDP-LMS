"use server";
import { revalidatePath } from "next/cache";
import {
  announcementSchema,
  notificationIdSchema,
  notificationSchema,
  preferenceSchema,
  scheduleSchema,
  templateSchema,
  templateVersionSchema
} from "@/features/notifications/schemas";
import { canManageNotifications } from "@/features/notifications/permissions";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

const invalid = (parsed: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) =>
  ({ fieldErrors: parsed.error.flatten().fieldErrors, success: false }) satisfies ActionResult;
function refresh() {
  for (const path of [
    "/student/notifications",
    "/student/inbox",
    "/student/messages",
    "/mentor/notifications",
    "/mentor/inbox",
    "/admin/notifications",
    "/admin/notifications/history",
    "/admin/announcements",
    "/admin/messages"
  ])
    revalidatePath(path);
}
async function client(action: string) {
  await enforceServerActionSecurity(action, 30);
  return createSupabaseServerClient();
}
async function notificationMutation(
  formData: FormData,
  rpc:
    | "mark_notification_read"
    | "mark_notification_unread"
    | "archive_notification"
    | "restore_notification"
    | "dismiss_notification"
    | "delete_notification",
  message: string
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client(`notification-${rpc}`)
  ).rpc(rpc, { p_notification_id: parsed.data.notificationId });
  if (error) return { error: "Notification could not be updated.", success: false };
  refresh();
  return { message, success: true };
}
export async function markNotificationRead(data: FormData) {
  return notificationMutation(data, "mark_notification_read", "Marked as read.");
}
export async function markNotificationUnread(data: FormData) {
  return notificationMutation(data, "mark_notification_unread", "Marked as unread.");
}
export async function archiveNotification(data: FormData) {
  return notificationMutation(data, "archive_notification", "Notification archived.");
}
export async function restoreNotification(data: FormData) {
  return notificationMutation(data, "restore_notification", "Notification restored.");
}
export async function dismissNotification(data: FormData) {
  return notificationMutation(data, "dismiss_notification", "Notification dismissed.");
}
export async function deleteNotification(data: FormData) {
  return notificationMutation(data, "delete_notification", "Notification deleted.");
}
export async function createNotification(input: unknown) {
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter valid notification details." };
  const identity = await resolveIdentityContext();
  if (
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId ||
    !(await canManageNotifications(identity.organizationId))
  )
    return { error: "Notification permission required." };
  const { data, error } = await (
    await client("notification-create")
  ).rpc("create_notification", {
    p_organization_id: parsed.data.organizationId,
    p_profile_id: parsed.data.profileId,
    p_type: parsed.data.type,
    p_purpose: parsed.data.purpose,
    p_data: { title: parsed.data.title, summary: parsed.data.summary },
    p_priority: parsed.data.priority
  });
  if (error) return { error: "Notification could not be created." };
  refresh();
  return { id: data as string };
}
export async function scheduleNotification(input: unknown) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose a valid schedule." };
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await canManageNotifications(identity.organizationId)))
    return { error: "Notification permission required." };
  const { data, error } = await (
    await client("notification-schedule")
  ).rpc("schedule_notification", {
    p_notification_id: parsed.data.notificationId,
    p_scheduled_for: parsed.data.scheduledFor,
    p_recurrence_rule: parsed.data.recurrenceRule ?? null
  });
  return error ? { error: "Notification could not be scheduled." } : { id: data as string };
}
export async function scheduleNotificationFromForm(formData: FormData): Promise<ActionResult> {
  const input = Object.fromEntries(formData);
  if (typeof input.scheduledFor === "string" && input.scheduledFor) {
    input.scheduledFor = new Date(input.scheduledFor).toISOString();
  }
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed);
  const result = await scheduleNotification(parsed.data);
  if ("error" in result) return { error: result.error, success: false };
  refresh();
  return { message: "Notification scheduled.", success: true };
}
export async function createNotificationTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId ||
    !(await canManageNotifications(identity.organizationId))
  )
    return { error: "Template permission required.", success: false };
  const supabase = await client("notification-template-create");
  const { data, error } = await supabase.rpc("create_notification_template", {
    p_organization_id: parsed.data.organizationId,
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_category_id: null
  });
  if (error) return { error: "Template could not be created.", success: false };
  const draft = await supabase.rpc("save_notification_template_draft", {
    p_template_id: data as string,
    p_channel: parsed.data.channel,
    p_locale: parsed.data.locale,
    p_subject_template: parsed.data.subject || null,
    p_body_template: parsed.data.body,
    p_variables: []
  });
  if (draft.error)
    return {
      error: "Template was created but its draft content could not be saved.",
      success: false
    };
  revalidatePath("/admin/notifications/templates");
  return { message: "Template created.", success: true };
}
export async function publishNotificationTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = templateVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await canManageNotifications(identity.organizationId)))
    return { error: "Template permission required.", success: false };
  const { error } = await (
    await client("notification-template-publish")
  ).rpc("publish_notification_template", {
    p_template_version_id: parsed.data.templateVersionId
  });
  if (error) return { error: "Template version could not be published.", success: false };
  revalidatePath("/admin/notifications/templates");
  return { message: "Template version published.", success: true };
}
export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId ||
    !(await canManageNotifications(identity.organizationId))
  )
    return { error: "Notification permission required.", success: false };
  const supabase = await client("announcement-create");
  const { data, error } = await supabase.rpc("create_announcement", {
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title,
    p_body: { markdown: parsed.data.body },
    p_audience_filter: { organization: true },
    p_priority: parsed.data.priority
  });
  if (error) return { error: "Announcement could not be created.", success: false };
  const publish = await supabase.rpc("publish_announcement", { p_message_id: data as string });
  if (publish.error)
    return { error: "Announcement draft was saved but could not be published.", success: false };
  refresh();
  return { message: "Announcement published.", success: true };
}
export async function updateNotificationPreference(formData: FormData): Promise<ActionResult> {
  const parsed = preferenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || identity.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await client("notification-preference")
  ).rpc("update_preferences", {
    p_organization_id: parsed.data.organizationId,
    p_category_id: parsed.data.categoryId || null,
    p_channel: parsed.data.channel,
    p_enabled: parsed.data.enabled,
    p_digest_frequency: parsed.data.digestFrequency,
    p_quiet_hours_start: parsed.data.quietHoursStart || null,
    p_quiet_hours_end: parsed.data.quietHoursEnd || null
  });
  if (error) return { error: "Preferences could not be updated.", success: false };
  refresh();
  return { message: "Preferences updated.", success: true };
}
