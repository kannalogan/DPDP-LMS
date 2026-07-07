"use server";

import { revalidatePath } from "next/cache";
import {
  announcementSchema,
  interventionCompleteSchema,
  interventionSchema,
  mentorNoteSchema,
  reviewResolveSchema
} from "@/features/mentor/schemas";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

function invalid(result: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false } satisfies ActionResult;
}

async function client(action: string) {
  await enforceServerActionSecurity(action, 60);
  return createSupabaseServerClient();
}

function refresh() {
  revalidatePath("/mentor");
  revalidatePath("/mentor/dashboard");
  revalidatePath("/mentor/learners");
  revalidatePath("/mentor/cohorts");
  revalidatePath("/mentor/reviews");
  revalidatePath("/mentor/tasks");
  revalidatePath("/mentor/announcements");
}

export async function recordMentorNote(formData: FormData): Promise<ActionResult> {
  const parsed = mentorNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("mentor-note")
  ).rpc("record_mentor_note", {
    p_learner_profile_id: parsed.data.learnerId,
    p_mentor_assignment_id: parsed.data.mentorAssignmentId,
    p_notes_ciphertext: parsed.data.notesCiphertext,
    p_reason: parsed.data.reason
  });
  if (error) return { error: "Mentor note could not be recorded.", success: false };
  refresh();
  return { message: "Mentor note recorded.", success: true };
}

export async function createIntervention(formData: FormData): Promise<ActionResult> {
  const parsed = interventionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("mentor-intervention")
  ).rpc("create_intervention", {
    p_follow_up_at: parsed.data.followUpAt ?? null,
    p_learner_profile_id: parsed.data.learnerId,
    p_mentor_assignment_id: parsed.data.mentorAssignmentId,
    p_reason: parsed.data.reason,
    p_type: parsed.data.type
  });
  if (error) return { error: "Intervention could not be created.", success: false };
  refresh();
  return { message: "Intervention created.", success: true };
}

export async function markInterventionComplete(formData: FormData): Promise<ActionResult> {
  const parsed = interventionCompleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("mentor-intervention-complete")
  ).rpc("mark_intervention_complete", {
    p_intervention_id: parsed.data.interventionId,
    p_outcome: parsed.data.outcome
  });
  if (error) return { error: "Intervention could not be completed.", success: false };
  refresh();
  return { message: "Intervention completed.", success: true };
}

export async function publishAnnouncement(formData: FormData): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("mentor-announcement")
  ).rpc("publish_announcement", {
    p_body: { markdown: parsed.data.body },
    p_cohort_id: parsed.data.cohortId,
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title
  });
  if (error) return { error: "Announcement could not be published.", success: false };
  refresh();
  return { message: "Announcement published.", success: true };
}

export async function resolveReviewItem(formData: FormData): Promise<ActionResult> {
  const parsed = reviewResolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("mentor-review-resolve")
  ).rpc("resolve_review_item", {
    p_review_id: parsed.data.reviewId,
    p_summary_ciphertext: parsed.data.summaryCiphertext ?? null
  });
  if (error) return { error: "Review item could not be resolved.", success: false };
  refresh();
  return { message: "Review item resolved.", success: true };
}
