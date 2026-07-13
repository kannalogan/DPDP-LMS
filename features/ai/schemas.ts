import { z } from "zod";
const uuid = z.string().uuid();
const key = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_.-]*$/)
  .max(100);
const title = z.string().trim().min(1).max(200);
export const providerSchema = z.object({
  adapterType: key,
  capabilities: z.string().trim().max(1000).default(""),
  key,
  name: title,
  organizationId: uuid
});
export const modelSchema = z.object({
  contextWindow: z.coerce.number().int().min(0).max(10_000_000),
  key,
  modality: z.enum(["text", "multimodal", "audio", "image"]),
  name: title,
  providerId: uuid
});
export const capabilitySchema = z.object({
  category: key,
  key,
  name: title,
  organizationId: uuid,
  riskTier: z.enum(["low", "medium", "high", "critical"])
});
export const workflowSchema = z.object({
  capabilityId: uuid,
  humanReviewRequired: z.enum(["true", "false"]).transform((value) => value === "true"),
  key,
  name: title,
  organizationId: uuid
});
export const promptTemplateSchema = z.object({
  key,
  organizationId: uuid,
  title,
  workflowId: uuid
});
export const promptVersionSchema = z.object({
  inputSchema: z.string().trim().default("{}"),
  outputSchema: z.string().trim().default("{}"),
  promptTemplateId: uuid,
  templateText: z.string().min(1).max(100_000)
});
export const guardrailSchema = z.object({
  enforcement: z.enum(["observe", "review", "block"]),
  key,
  name: title,
  organizationId: uuid,
  scope: z.string().trim().min(1).max(100)
});
export const usageBudgetSchema = z.object({
  budgetMinor: z.coerce.number().int().min(0),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  organizationId: uuid,
  period: z.enum(["month", "quarter", "year"]),
  warningThreshold: z.coerce.number().min(0).max(1)
});
export const conversationSchema = z.object({
  organizationId: uuid,
  purpose: z.string().trim().min(1).max(100),
  retentionDays: z.coerce.number().int().min(1).max(365)
});
export const feedbackSchema = z.object({
  promptRunId: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  reasonCodes: z.string().trim().max(500).default("")
});
