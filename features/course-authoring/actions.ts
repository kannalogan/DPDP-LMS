"use server";

import { revalidatePath } from "next/cache";
import {
  courseDraftSchema,
  courseIdSchema,
  decisionSchema,
  draftIdSchema,
  editorEventSchema,
  editorLockSchema,
  parseJsonObject,
  rejectDecisionSchema,
  reviewCourseSchema,
  saveCourseDraftSchema,
  schedulePublicationSchema,
  unlockEditorSchema
} from "@/features/course-authoring/schemas";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

function invalid(result: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false } satisfies ActionResult;
}

async function client(action: string) {
  await enforceServerActionSecurity(action, 30);
  return createSupabaseServerClient();
}

function refresh() {
  for (const path of [
    "/admin/authoring",
    "/admin/authoring/courses",
    "/admin/authoring/resources",
    "/admin/authoring/categories",
    "/admin/authoring/publishing",
    "/mentor/authoring",
    "/mentor/authoring/courses"
  ]) {
    revalidatePath(path);
  }
}

export async function createCourseDraft(formData: FormData): Promise<ActionResult> {
  const parsed = courseDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-draft-create")
  ).rpc("create_course_draft", {
    p_description: parsed.data.description,
    p_organization_id: parsed.data.organizationId,
    p_slug: parsed.data.slug,
    p_title: parsed.data.title,
    p_track_id: parsed.data.trackId
  });
  if (error) return { error: "Course draft could not be created.", success: false };
  refresh();
  return { message: "Course draft created.", success: true };
}

export async function saveCourseDraft(formData: FormData): Promise<ActionResult> {
  const parsed = saveCourseDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-draft-save")
  ).rpc("save_course_draft", {
    p_body: parseJsonObject(parsed.data.body),
    p_description: parsed.data.description,
    p_draft_id: parsed.data.draftId,
    p_metadata: parseJsonObject(parsed.data.metadata),
    p_title: parsed.data.title
  });
  if (error) return { error: "Course draft could not be saved.", success: false };
  refresh();
  return { message: "Course draft saved.", success: true };
}

export async function submitCourseReview(formData: FormData): Promise<ActionResult> {
  const parsed = reviewCourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-review-submit")
  ).rpc("submit_course_review", {
    p_draft_id: parsed.data.draftId,
    p_notes: parsed.data.notes
  });
  if (error) return { error: "Course review could not be submitted.", success: false };
  refresh();
  return { message: "Course submitted for review.", success: true };
}

export async function approveCourse(formData: FormData): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-course-approve")
  ).rpc("approve_course", {
    p_notes: parsed.data.notes,
    p_review_id: parsed.data.reviewId
  });
  if (error) return { error: "Course could not be approved.", success: false };
  refresh();
  return { message: "Course approved.", success: true };
}

export async function rejectCourse(formData: FormData): Promise<ActionResult> {
  const parsed = rejectDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-course-reject")
  ).rpc("reject_course", {
    p_notes: parsed.data.notes,
    p_review_id: parsed.data.reviewId
  });
  if (error) return { error: "Course could not be rejected.", success: false };
  refresh();
  return { message: "Course rejected.", success: true };
}

export async function schedulePublication(formData: FormData): Promise<ActionResult> {
  const parsed = schedulePublicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-publication-schedule")
  ).rpc("schedule_publication", {
    p_draft_id: parsed.data.draftId,
    p_scheduled_at: parsed.data.scheduledAt
  });
  if (error) return { error: "Publication could not be scheduled.", success: false };
  refresh();
  return { message: "Publication scheduled.", success: true };
}

export async function publishCourse(formData: FormData): Promise<ActionResult> {
  const parsed = draftIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-course-publish")
  ).rpc("publish_course", { p_draft_id: parsed.data.draftId });
  if (error) return { error: "Course could not be published.", success: false };
  refresh();
  return { message: "Course published.", success: true };
}

export async function archiveCourse(formData: FormData): Promise<ActionResult> {
  const parsed = courseIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-course-archive")
  ).rpc("archive_course", { p_course_id: parsed.data.courseId });
  if (error) return { error: "Course could not be archived.", success: false };
  refresh();
  return { message: "Course archived.", success: true };
}

export async function lockEditor(formData: FormData): Promise<ActionResult> {
  const parsed = editorLockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-editor-lock")
  ).rpc("lock_editor", {
    p_draft_id: parsed.data.draftId,
    p_expires_at: parsed.data.expiresAt
  });
  if (error) return { error: "Editor could not be locked.", success: false };
  refresh();
  return { message: "Editor locked.", success: true };
}

export async function unlockEditor(formData: FormData): Promise<ActionResult> {
  const parsed = unlockEditorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-editor-unlock")
  ).rpc("unlock_editor", { p_lock_id: parsed.data.lockId });
  if (error) return { error: "Editor could not be unlocked.", success: false };
  refresh();
  return { message: "Editor unlocked.", success: true };
}

export async function recordEditorEvent(formData: FormData): Promise<ActionResult> {
  const parsed = editorEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("authoring-editor-event")
  ).rpc("record_editor_event", {
    p_draft_id: parsed.data.draftId,
    p_event_type: parsed.data.eventType,
    p_metadata: parseJsonObject(parsed.data.metadata)
  });
  if (error) return { error: "Editor event could not be recorded.", success: false };
  return { message: "Editor event recorded.", success: true };
}
