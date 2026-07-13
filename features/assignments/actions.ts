"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAssignmentContext } from "@/features/assignments/authorization";
import {
  createAssignmentSchema,
  gradeDraftSchema,
  rubricDraftSchema,
  saveAssignmentDraftSchema,
  submissionDraftSchema,
  submissionFileSchema
} from "@/features/assignments/schemas";
async function rpc(name: string, args: Record<string, unknown>) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc(name, args);
  return error
    ? { success: false, error: "The assignment operation could not be completed." }
    : { success: true, data };
}
export async function createAssignment(input: unknown) {
  const parsed = createAssignmentSchema.safeParse(input);
  const identity = await resolveAssignmentContext("admin");
  if (
    !parsed.success ||
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId
  )
    return { success: false, error: "Assignment permission and valid details are required." };
  const result = await rpc("create_assignment", {
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title,
    p_assignment_type: parsed.data.assignmentType
  });
  if (result.success) revalidatePath("/admin/assignments");
  return result;
}
export async function saveAssignmentDraft(input: unknown) {
  const parsed = saveAssignmentDraftSchema.safeParse(input);
  if (!parsed.success || !(await resolveAssignmentContext("admin")))
    return { success: false, error: "Valid assignment details and authoring access are required." };
  const result = await rpc("save_assignment_draft", {
    p_assignment_id: parsed.data.assignmentId,
    p_title: parsed.data.title,
    p_payload: { ...parsed.data }
  });
  if (result.success) revalidatePath("/admin/assignments/" + parsed.data.assignmentId);
  return result;
}
export async function startSubmission(assignmentAssignmentId: string) {
  if (!(await resolveAssignmentContext("student")))
    return { success: false, error: "Student assignment access required." };
  return rpc("start_assignment_submission", { p_assignment_assignment_id: assignmentAssignmentId });
}
export async function saveSubmissionDraft(input: unknown) {
  const parsed = submissionDraftSchema.safeParse(input);
  if (!parsed.success || !(await resolveAssignmentContext("student")))
    return { success: false, error: "Valid submission content is required." };
  return rpc("save_submission_draft", {
    p_submission_version_id: parsed.data.submissionVersionId,
    p_entry_type: parsed.data.entryType,
    p_body_ciphertext: parsed.data.bodyCiphertext,
    p_content_hash: parsed.data.contentHash
  });
}
export async function attachSubmissionFile(input: unknown) {
  const parsed = submissionFileSchema.safeParse(input);
  if (!parsed.success || !(await resolveAssignmentContext("student")))
    return { success: false, error: "Valid private file metadata is required." };
  return rpc("attach_submission_file", {
    p_submission_version_id: parsed.data.submissionVersionId,
    p_storage_object_id: parsed.data.storageObjectId,
    p_display_name: parsed.data.displayName
  });
}
export async function submitAssignment(submissionVersionId: string) {
  if (!(await resolveAssignmentContext("student")))
    return { success: false, error: "Student assignment access required." };
  const result = await rpc("submit_assignment", { p_submission_version_id: submissionVersionId });
  if (result.success) revalidatePath("/student/assignments");
  return result;
}
export async function claimGradingItem(queueItemId: string) {
  if (!(await resolveAssignmentContext("mentor")))
    return { success: false, error: "Grading permission required." };
  return rpc("claim_grading_item", { p_grading_queue_item_id: queueItemId });
}
export async function saveGradingDraft(input: unknown) {
  const parsed = gradeDraftSchema.safeParse(input);
  if (!parsed.success || !(await resolveAssignmentContext("mentor")))
    return { success: false, error: "Valid grading details are required." };
  return rpc("save_grading_draft", {
    p_grading_assignment_id: parsed.data.gradingAssignmentId,
    p_score: parsed.data.score,
    p_feedback_ciphertext: parsed.data.feedbackCiphertext
  });
}
export async function saveRubricDraft(input: unknown) {
  const parsed = rubricDraftSchema.safeParse(input);
  if (!parsed.success || !(await resolveAssignmentContext("admin")))
    return { success: false, error: "Rubric criteria must be valid and total 100 percent." };
  return rpc("save_rubric_draft", {
    p_rubric_id: parsed.data.rubricId,
    p_max_score: parsed.data.maxScore,
    p_criteria: parsed.data.criteria
  });
}
