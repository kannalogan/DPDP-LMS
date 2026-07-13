import { z } from "zod";
import { questionTypes } from "@/features/question-authoring/workflow";

const uuid = z.string().uuid();
const jsonText = z.string().optional().default("{}");

export const createQuestionSchema = z.object({
  organizationId: uuid,
  prompt: jsonText,
  questionBankId: uuid,
  type: z.enum(questionTypes as [string, ...string[]])
});

export const saveQuestionSchema = z.object({
  choices: z.string().optional().default("[]"),
  metadata: jsonText,
  prompt: jsonText,
  questionDraftId: uuid
});

export const questionIdSchema = z.object({ questionDraftId: uuid });
export const questionDecisionSchema = z.object({
  notes: z.string().max(2000).optional().default(""),
  questionDraftId: uuid
});
export const rejectQuestionSchema = questionDecisionSchema.extend({
  notes: z.string().trim().min(1).max(2000)
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organizationId: uuid,
  questionBankId: uuid
});

export const collectionQuestionSchema = z.object({
  collectionId: uuid,
  points: z.coerce.number().positive().optional().default(1),
  position: z.coerce.number().int().positive(),
  questionDraftId: uuid
});

export const templateSchema = z.object({
  blueprintId: uuid.optional(),
  organizationId: uuid,
  title: z.string().trim().min(1).max(300)
});

export const saveTemplateSchema = z.object({
  instructions: jsonText,
  randomizationPolicy: jsonText,
  templateId: uuid,
  title: z.string().trim().min(1).max(300)
});

export const reviewerSchema = z.object({
  organizationId: uuid,
  reviewerProfileId: uuid,
  targetId: uuid,
  targetType: z.enum(["question_draft", "assessment_template"])
});

export const authoringEventSchema = z.object({
  eventType: z.string().regex(/^[a-z][a-z0-9_.-]*$/),
  metadata: jsonText,
  organizationId: uuid,
  targetId: uuid,
  targetType: z.enum(["question_draft", "assessment_template", "import_job", "collection"])
});

export function parseJsonValue(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
