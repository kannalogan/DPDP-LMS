import { z } from "zod";
const uuid = z.string().uuid();
export const assignmentTypeSchema = z.enum([
  "text_response",
  "rich_text_response",
  "file_upload",
  "multi_file_upload",
  "url_submission",
  "case_study",
  "project_submission",
  "practical_evidence",
  "portfolio_submission",
  "offline_completion",
  "code_submission",
  "lab_evidence"
]);
export const createAssignmentSchema = z.object({
  organizationId: uuid,
  title: z.string().trim().min(1).max(200),
  assignmentType: assignmentTypeSchema
});
export const saveAssignmentDraftSchema = z
  .object({
    assignmentId: uuid,
    title: z.string().trim().min(1).max(200),
    submissionType: assignmentTypeSchema,
    totalMarks: z.number().positive().max(100000),
    passingScore: z.number().min(0).optional(),
    maximumAttempts: z.number().int().min(1).max(100).default(1),
    maximumFiles: z.number().int().min(1).max(50).default(1),
    maximumFileBytes: z.number().int().positive().max(1073741824).default(10485760),
    acceptedFileTypes: z.array(z.string().min(1)).max(30).default([]),
    description: z.record(z.unknown()).default({}),
    instructions: z.record(z.unknown()).default({}),
    learningOutcomes: z.array(z.unknown()).default([]),
    gradingMode: z.enum(["points", "rubric", "pass_fail"]).default("points"),
    anonymousGrading: z.boolean().default(false)
  })
  .refine((value) => value.passingScore === undefined || value.passingScore <= value.totalMarks, {
    message: "Passing score cannot exceed total marks."
  });
export const submissionDraftSchema = z.object({
  submissionVersionId: uuid,
  entryType: z.enum(["text", "rich_text", "url", "offline_record"]),
  bodyCiphertext: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/)
});
export const submissionFileSchema = z.object({
  submissionVersionId: uuid,
  storageObjectId: uuid,
  displayName: z.string().trim().min(1).max(255)
});
export const gradeDraftSchema = z.object({
  gradingAssignmentId: uuid,
  score: z.number().min(0),
  feedbackCiphertext: z.string().min(1)
});
export const rubricDraftSchema = z
  .object({
    rubricId: uuid,
    maxScore: z.number().positive(),
    criteria: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          description: z.string().default(""),
          weight: z.number().positive().max(100),
          levels: z.array(z.record(z.unknown())).min(1)
        })
      )
      .min(1)
  })
  .refine(
    (value) => Math.abs(value.criteria.reduce((sum, item) => sum + item.weight, 0) - 100) < 0.01,
    { message: "Rubric weights must total 100." }
  );
