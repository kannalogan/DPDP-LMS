"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  enrollmentCommandSchema,
  lessonBookmarkSchema,
  lessonCommandSchema,
  lessonProgressSchema,
  noteDeleteSchema,
  noteSchema,
  resourceBookmarkSchema
} from "@/features/learning-delivery/schemas";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { encryptEnvelope, requireNoteEncryptionKey } from "@/lib/security/envelope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

function invalid(result: {
  error: { flatten(): { fieldErrors: Record<string, string[]> } };
}): ActionResult {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false };
}

async function secureContext(action: string) {
  await enforceServerActionSecurity(action, 30);
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await can(identity.organizationId, "organization.read"))) {
    throw new Error("Learning permission denied");
  }
  return identity;
}

function refresh(courseSlug: string, lessonSlug?: string) {
  revalidatePath("/student");
  revalidatePath("/student/courses");
  revalidatePath(`/student/courses/${courseSlug}`);
  if (lessonSlug) revalidatePath(`/student/courses/${courseSlug}/lessons/${lessonSlug}`);
}

async function runProgressCommand(
  formData: FormData,
  schema: typeof lessonCommandSchema | typeof lessonProgressSchema,
  rpc: "syra_start_lesson" | "syra_update_lesson_progress" | "syra_complete_lesson",
  successMessage: string
): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await secureContext(rpc);
    const input = parsed.data as z.infer<typeof lessonProgressSchema>;
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc(rpc, {
      enrollment_id: input.enrollmentId,
      lesson_id: input.lessonId,
      ...(rpc === "syra_update_lesson_progress" ? { progress: input.progress } : {})
    });
    if (error) return { error: "Progress could not be synchronized.", success: false };
    refresh(input.courseSlug, input.lessonSlug);
    return { message: successMessage, success: true };
  } catch {
    return { error: "Progress could not be synchronized.", success: false };
  }
}

async function runCourseCommand(
  formData: FormData,
  rpc: "syra_start_course" | "syra_resume_course",
  message: string
): Promise<ActionResult> {
  const parsed = enrollmentCommandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await secureContext(rpc);
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc(rpc, { enrollment_id: parsed.data.enrollmentId });
    if (error) return { error: "Course progress could not be updated.", success: false };
    refresh(parsed.data.courseSlug);
    return { message, success: true };
  } catch {
    return { error: "Course progress could not be updated.", success: false };
  }
}

export async function startCourse(formData: FormData) {
  return runCourseCommand(formData, "syra_start_course", "Course started.");
}

export async function resumeCourse(formData: FormData) {
  return runCourseCommand(formData, "syra_resume_course", "Course resumed.");
}

export async function startLesson(formData: FormData) {
  return runProgressCommand(formData, lessonCommandSchema, "syra_start_lesson", "Lesson started.");
}

export async function updateLessonProgress(formData: FormData) {
  return runProgressCommand(
    formData,
    lessonProgressSchema,
    "syra_update_lesson_progress",
    "Progress synchronized."
  );
}

export async function completeLesson(formData: FormData) {
  return runProgressCommand(
    formData,
    lessonCommandSchema,
    "syra_complete_lesson",
    "Lesson completed."
  );
}

export async function saveLessonNote(formData: FormData): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const identity = await secureContext("lesson-note-save");
    const ciphertext = await encryptEnvelope(parsed.data.body, requireNoteEncryptionKey());
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("syra_save_lesson_note", {
      body_ciphertext: ciphertext,
      lesson_id: parsed.data.lessonId,
      note_id: parsed.data.noteId || null,
      organization_id: identity.organizationId
    });
    if (error) return { error: "Your private note could not be saved.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Private note saved.", success: true };
  } catch {
    return { error: "Private notes are unavailable or could not be encrypted.", success: false };
  }
}

export async function deleteLessonNote(formData: FormData): Promise<ActionResult> {
  const parsed = noteDeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await secureContext("lesson-note-delete");
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("syra_delete_lesson_note", {
      note_id: parsed.data.noteId
    });
    if (error || data !== true) return { error: "Note could not be deleted.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Note deleted.", success: true };
  } catch {
    return { error: "Note could not be deleted.", success: false };
  }
}

export async function bookmarkLesson(formData: FormData): Promise<ActionResult> {
  const parsed = lessonBookmarkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const identity = await secureContext("lesson-bookmark");
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("syra_bookmark_lesson", {
      lesson_id: parsed.data.lessonId,
      organization_id: identity.organizationId,
      bookmark_position: {}
    });
    if (error) return { error: "Lesson could not be bookmarked.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Lesson bookmarked.", success: true };
  } catch {
    return { error: "Lesson could not be bookmarked.", success: false };
  }
}

export async function removeLessonBookmark(formData: FormData): Promise<ActionResult> {
  const parsed = lessonBookmarkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await secureContext("lesson-bookmark-remove");
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("syra_remove_lesson_bookmark", {
      lesson_id: parsed.data.lessonId
    });
    if (error) return { error: "Lesson bookmark could not be removed.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Bookmark removed.", success: true };
  } catch {
    return { error: "Lesson bookmark could not be removed.", success: false };
  }
}

export async function bookmarkResource(formData: FormData): Promise<ActionResult> {
  const parsed = resourceBookmarkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const identity = await secureContext("resource-bookmark");
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("syra_bookmark_resource", {
      organization_id: identity.organizationId,
      bookmark_position: {},
      resource_version_id: parsed.data.resourceVersionId
    });
    if (error) return { error: "Resource could not be bookmarked.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Resource bookmarked.", success: true };
  } catch {
    return { error: "Resource could not be bookmarked.", success: false };
  }
}

export async function removeResourceBookmark(formData: FormData): Promise<ActionResult> {
  const parsed = resourceBookmarkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await secureContext("resource-bookmark-remove");
    const client = await createSupabaseServerClient();
    const { error } = await client.rpc("syra_remove_resource_bookmark", {
      resource_version_id: parsed.data.resourceVersionId
    });
    if (error) return { error: "Resource bookmark could not be removed.", success: false };
    refresh(parsed.data.courseSlug, parsed.data.lessonSlug);
    return { message: "Resource bookmark removed.", success: true };
  } catch {
    return { error: "Resource bookmark could not be removed.", success: false };
  }
}
