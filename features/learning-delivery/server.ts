import "server-only";
import { cache } from "react";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { SupabaseLearningDeliveryRepository } from "@/features/learning-delivery/repositories/supabase-learning-delivery-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseCatalogFilters } from "@/features/learning-delivery/types";

const context = cache(async () => {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  const allowed = await can(identity.organizationId, "organization.read");
  return allowed
    ? { organizationId: identity.organizationId, profileId: identity.profileId }
    : null;
});

async function repository() {
  const resolved = await context();
  if (!resolved) return null;
  return new SupabaseLearningDeliveryRepository(
    await createSupabaseServerClient(),
    resolved.profileId,
    resolved.organizationId
  );
}

export async function canAccessLearningDelivery() {
  return Boolean(await context());
}

export async function getStudentCourseCatalog(filters: CourseCatalogFilters = {}) {
  return (await repository())?.getStudentCourseCatalog(filters) ?? [];
}

export async function getStudentCourseDetail(courseSlug: string) {
  return (await repository())?.getStudentCourseDetail(courseSlug) ?? null;
}

export async function getStudentModuleDetail(courseSlug: string, moduleId: string) {
  return (await repository())?.getStudentModuleDetail(courseSlug, moduleId) ?? null;
}

export async function getStudentLessonDetail(courseSlug: string, lessonSlug: string) {
  return (await repository())?.getStudentLessonDetail(courseSlug, lessonSlug) ?? null;
}

export async function getContinueLearningTarget() {
  return (await repository())?.getContinueLearningTarget() ?? null;
}

export async function getLessonNavigation(courseSlug: string, lessonSlug: string) {
  return (await getStudentLessonDetail(courseSlug, lessonSlug))?.navigation ?? null;
}

export async function getLessonResources(courseSlug: string, lessonSlug: string) {
  return (await getStudentLessonDetail(courseSlug, lessonSlug))?.resources ?? [];
}

export async function getLessonNotes(courseSlug: string, lessonSlug: string) {
  const lesson = await getStudentLessonDetail(courseSlug, lessonSlug);
  return lesson
    ? {
        available: lesson.notesAvailable,
        items: lesson.notes,
        reason: lesson.notesUnavailableReason
      }
    : { available: false, items: [], reason: "Lesson is unavailable." };
}

export async function getLessonBookmarks(courseSlug: string, lessonSlug: string) {
  const lesson = await getStudentLessonDetail(courseSlug, lessonSlug);
  return lesson ? { bookmarked: lesson.bookmarked, position: lesson.resumePosition } : null;
}

export async function getCourseProgressProjection(courseSlug: string) {
  return (await repository())?.getCourseProgressProjection(courseSlug) ?? null;
}
