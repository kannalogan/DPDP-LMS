import { z } from "zod";

const uuid = z.string().uuid();
export const assessmentRouteSchema = z.object({ assessmentId: uuid });
export const assessmentStartSchema = z.object({
  assessmentId: uuid,
  assignmentId: uuid,
  idempotencyKey: uuid
});
export const attemptCommandSchema = z.object({ assessmentId: uuid, attemptId: uuid });
export const answerCommandSchema = attemptCommandSchema.extend({
  attemptItemId: uuid,
  clientVersion: z.coerce.number().int().positive().max(2_147_483_647),
  response: z
    .string()
    .max(100_000)
    .transform((value, context) => {
      try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
        return parsed as Record<string, unknown>;
      } catch {
        context.addIssue({ code: "custom", message: "Invalid answer payload" });
        return z.NEVER;
      }
    })
});
export const reviewCommandSchema = attemptCommandSchema.extend({ attemptItemId: uuid });
