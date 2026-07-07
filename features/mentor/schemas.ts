import { z } from "zod";

const uuid = z.string().uuid();

export const learnerRouteSchema = z.object({ learnerId: uuid });
export const cohortRouteSchema = z.object({ cohortId: uuid });

export const mentorNoteSchema = z.object({
  learnerId: uuid,
  mentorAssignmentId: uuid,
  notesCiphertext: z.string().min(8),
  reason: z.string().trim().min(2).max(500)
});

export const interventionSchema = z.object({
  followUpAt: z.string().datetime().optional(),
  learnerId: uuid,
  mentorAssignmentId: uuid,
  reason: z.string().trim().min(2).max(500),
  type: z.enum([
    "nudge",
    "support",
    "risk_review",
    "assessment_review",
    "certificate_followup",
    "other"
  ])
});

export const interventionCompleteSchema = z.object({
  interventionId: uuid,
  outcome: z.string().trim().min(2).max(500)
});

export const announcementSchema = z.object({
  body: z.string().trim().min(2).max(5000),
  cohortId: uuid,
  organizationId: uuid,
  title: z.string().trim().min(1).max(200)
});

export const reviewResolveSchema = z.object({
  reviewId: uuid,
  summaryCiphertext: z.string().min(8).optional()
});
