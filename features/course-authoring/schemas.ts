import { z } from "zod";

const uuid = z.string().uuid();
const title = z.string().trim().min(1).max(300);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const courseDraftSchema = z.object({
  description: z.string().max(2000).optional().default(""),
  organizationId: uuid,
  slug,
  title,
  trackId: uuid
});

export const saveCourseDraftSchema = z.object({
  body: z.string().optional().default("{}"),
  description: z.string().max(2000).optional().default(""),
  draftId: uuid,
  metadata: z.string().optional().default("{}"),
  title
});

export const reviewCourseSchema = z.object({
  draftId: uuid,
  notes: z.string().max(2000).optional().default("")
});

export const decisionSchema = z.object({
  notes: z.string().max(2000).optional().default(""),
  reviewId: uuid
});

export const rejectDecisionSchema = decisionSchema.extend({
  notes: z.string().trim().min(1).max(2000)
});

export const schedulePublicationSchema = z.object({
  draftId: uuid,
  scheduledAt: z.string().datetime()
});

export const draftIdSchema = z.object({ draftId: uuid });
export const courseIdSchema = z.object({ courseId: uuid });

export const editorLockSchema = z.object({
  draftId: uuid,
  expiresAt: z.string().datetime()
});

export const unlockEditorSchema = z.object({ lockId: uuid });

export const editorEventSchema = z.object({
  draftId: uuid,
  eventType: z.string().regex(/^[a-z][a-z0-9_.-]*$/),
  metadata: z.string().optional().default("{}")
});

export function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
