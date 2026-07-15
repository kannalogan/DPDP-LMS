"use server";
import { revalidatePath } from "next/cache";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  attendanceSchema,
  channelSchema,
  discussionSchema,
  identifierSchema,
  liveSessionSchema,
  messageSchema,
  moderationSchema,
  officeHourSchema,
  officeScheduleSchema,
  reactionSchema,
  replySchema,
  reportSchema,
  studyGroupSchema
} from "@/features/community/schemas";
import type { ActionResult } from "@/types/identity";

const refresh = () =>
  [
    "/student/community",
    "/student/messages",
    "/student/live",
    "/student/study-groups",
    "/student/office-hours",
    "/mentor/community",
    "/mentor/messages",
    "/mentor/live",
    "/mentor/office-hours",
    "/mentor/study-groups",
    "/admin/community",
    "/admin/moderation",
    "/admin/live",
    "/admin/reports/community"
  ].forEach((path) => revalidatePath(path));
const invalid = { error: "Enter valid community details.", success: false } satisfies ActionResult;
async function rpc(action: string) {
  await enforceServerActionSecurity(`community-${action}`, 30);
  return createSupabaseServerClient();
}
const form = (data: FormData) => Object.fromEntries(data);

export async function createDiscussionAction(data: FormData): Promise<ActionResult> {
  const parsed = discussionSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("discussion-create")
  ).rpc("create_discussion", {
    p_body: parsed.data.body,
    p_category_id: parsed.data.categoryId || null,
    p_space_id: parsed.data.spaceId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Discussion could not be created.", success: false };
  refresh();
  return { message: "Discussion created.", success: true };
}
export async function replyDiscussionAction(data: FormData): Promise<ActionResult> {
  const parsed = replySchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("discussion-reply")
  ).rpc("reply_discussion", {
    p_body: parsed.data.body,
    p_parent_post_id: parsed.data.parentPostId || null,
    p_topic_id: parsed.data.topicId
  });
  if (error) return { error: "Reply could not be posted.", success: false };
  refresh();
  return { message: "Reply posted.", success: true };
}
export async function reactPostAction(data: FormData): Promise<ActionResult> {
  const parsed = reactionSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("post-react")
  ).rpc("react_post", { p_post_id: parsed.data.postId, p_reaction: parsed.data.reaction });
  if (error) return { error: "Reaction could not be updated.", success: false };
  refresh();
  return { message: "Reaction updated.", success: true };
}
export async function reportPostAction(data: FormData): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("post-report")
  ).rpc("report_post", {
    p_details: parsed.data.details ?? null,
    p_post_id: parsed.data.postId,
    p_reason: parsed.data.reason
  });
  if (error) return { error: "Report could not be submitted.", success: false };
  return { message: "Report submitted for review.", success: true };
}
export async function sendMessageAction(data: FormData): Promise<ActionResult> {
  const parsed = messageSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("message-send")
  ).rpc("send_message", {
    p_body: parsed.data.body,
    p_channel_id: parsed.data.channelId,
    p_metadata: {},
    p_parent_message_id: parsed.data.parentMessageId || null
  });
  if (error) return { error: "Message could not be sent.", success: false };
  refresh();
  return { message: "Message sent.", success: true };
}
export async function createChannel(input: unknown) {
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter valid channel details." };
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required." };
  const { data, error } = await (
    await rpc("channel-create")
  ).rpc("create_chat_channel", {
    p_channel_type: parsed.data.type,
    p_member_profile_ids: parsed.data.memberIds,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId
  });
  return error ? { error: "Channel could not be created." } : { id: data as string };
}
export async function createLiveSession(input: unknown) {
  const parsed = liveSessionSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid live session." };
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required." };
  const { data, error } = await (
    await rpc("live-create")
  ).rpc("create_live_session", {
    p_capacity: parsed.data.capacity,
    p_course_id: null,
    p_description: parsed.data.description,
    p_ends_at: parsed.data.endsAt,
    p_organization_id: parsed.data.organizationId,
    p_provider: parsed.data.provider,
    p_recording_allowed: false,
    p_space_id: null,
    p_starts_at: parsed.data.startsAt,
    p_title: parsed.data.title,
    p_waiting_room_enabled: true
  });
  return error ? { error: "Live session could not be scheduled." } : { id: data as string };
}
export async function createLiveSessionAction(data: FormData): Promise<ActionResult> {
  const input = form(data);
  for (const key of ["startsAt", "endsAt"])
    if (typeof input[key] === "string" && input[key])
      input[key] = new Date(String(input[key])).toISOString();
  const result = await createLiveSession(input);
  if ("error" in result) return { error: result.error, success: false };
  refresh();
  return { message: "Live session scheduled.", success: true };
}
export async function joinLiveSession(input: unknown) {
  const parsed = identifierSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid live session." };
  const { data, error } = await (
    await rpc("live-join")
  ).rpc("join_live_session", { p_session_id: parsed.data.id });
  return error ? { error: "Live session could not be joined." } : { id: data as string };
}
export async function recordLiveAttendance(input: unknown) {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid attendance evidence." };
  const { data, error } = await (
    await rpc("attendance-record")
  ).rpc("record_attendance", {
    p_joined_at: parsed.data.joinedAt,
    p_left_at: parsed.data.leftAt ?? null,
    p_profile_id: parsed.data.profileId,
    p_session_id: parsed.data.sessionId,
    p_source: "platform",
    p_status: parsed.data.status
  });
  return error ? { error: "Attendance could not be recorded." } : { id: data as string };
}
export async function bookOfficeHourAction(data: FormData): Promise<ActionResult> {
  const parsed = officeHourSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("office-book")
  ).rpc("book_office_hour", {
    p_agenda: parsed.data.agenda ?? null,
    p_office_hour_id: parsed.data.officeHourId
  });
  if (error) return { error: "Office hour could not be booked.", success: false };
  refresh();
  return { message: "Office hour booked.", success: true };
}
export async function scheduleOfficeHoursAction(data: FormData): Promise<ActionResult> {
  const input = form(data);
  for (const key of ["startsAt", "endsAt"])
    if (typeof input[key] === "string" && input[key])
      input[key] = new Date(String(input[key])).toISOString();
  const parsed = officeScheduleSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await rpc("office-schedule")
  ).rpc("schedule_office_hours", {
    p_capacity: parsed.data.capacity,
    p_description: parsed.data.description,
    p_ends_at: parsed.data.endsAt,
    p_meeting_provider: parsed.data.provider || null,
    p_organization_id: parsed.data.organizationId,
    p_recurrence_rule: null,
    p_starts_at: parsed.data.startsAt,
    p_title: parsed.data.title
  });
  if (error) return { error: "Office hours could not be scheduled.", success: false };
  refresh();
  return { message: "Office hours scheduled.", success: true };
}
export async function resolveReportAction(data: FormData): Promise<ActionResult> {
  const parsed = moderationSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("report-resolve")
  ).rpc("resolve_discussion_report", {
    p_report_id: parsed.data.reportId,
    p_resolution: parsed.data.resolution,
    p_status: parsed.data.status
  });
  if (error) return { error: "Report could not be resolved.", success: false };
  refresh();
  return { message: "Moderation decision recorded.", success: true };
}
export async function createStudyGroupAction(data: FormData): Promise<ActionResult> {
  const parsed = studyGroupSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await rpc("group-create")
  ).rpc("create_study_group", {
    p_capacity: parsed.data.capacity,
    p_course_id: null,
    p_description: parsed.data.description,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_visibility: parsed.data.visibility
  });
  if (error) return { error: "Study group could not be created.", success: false };
  refresh();
  return { message: "Study group created.", success: true };
}
export async function joinStudyGroupAction(data: FormData): Promise<ActionResult> {
  const parsed = identifierSchema.safeParse(form(data));
  if (!parsed.success) return invalid;
  const { error } = await (
    await rpc("group-join")
  ).rpc("join_study_group", { p_study_group_id: parsed.data.id });
  if (error) return { error: "Study group could not be joined.", success: false };
  refresh();
  return { message: "Study group joined.", success: true };
}
