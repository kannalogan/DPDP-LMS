import { z } from "zod";
import { aiDataClassifications, aiProviderKeys } from "@/features/ai/execution/types";
import { aiCapabilityKeys } from "@/features/ai/types";

const scalarMetadata = z.union([z.boolean(), z.number().finite(), z.string().trim().max(500)]);
const jsonSchema = z.record(z.string(), z.unknown());
const responseFormatSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text") }),
  z.object({ type: z.literal("json_object") }),
  z.object({
    name: z
      .string()
      .trim()
      .regex(/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/),
    schema: jsonSchema,
    type: z.literal("json_schema")
  })
]);

export const aiExecutionInputSchema = z
  .object({
    capability: z.enum([...aiCapabilityKeys, "structured_output"]),
    dataClassification: z.enum(aiDataClassifications),
    idempotencyKey: z.string().trim().min(16).max(200),
    maximumOutputTokens: z.number().int().min(1).max(100000).optional(),
    messages: z
      .array(
        z.object({
          content: z.string().min(1).max(500000),
          role: z.enum(["assistant", "user"])
        })
      )
      .min(1)
      .max(200),
    metadata: z.record(z.string().max(100), scalarMetadata).default({}),
    model: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/)
      .optional(),
    provider: z.enum(aiProviderKeys).optional(),
    responseFormat: responseFormatSchema.default({ type: "text" }),
    systemInstructions: z.string().max(50000).default(""),
    temperature: z.number().min(0).max(2).default(0.2),
    timeoutMs: z.number().int().min(1000).max(600000).optional(),
    traceId: z.string().uuid().optional()
  })
  .strict();

export const providerTestSchema = z.object({ provider: z.enum(aiProviderKeys) }).strict();

export const killSwitchSchema = z
  .object({
    enabled: z.boolean(),
    endsAt: z.string().datetime().nullable().default(null),
    modelId: z.string().uuid().nullable().default(null),
    organizationId: z.string().uuid(),
    providerId: z.string().uuid().nullable().default(null),
    reasonCode: z.string().regex(/^[a-z][a-z0-9_.-]{0,99}$/),
    scope: z.enum(["organization", "provider", "model"])
  })
  .superRefine((value, context) => {
    if (value.scope === "provider" && !value.providerId)
      context.addIssue({ code: "custom", message: "Provider is required.", path: ["providerId"] });
    if (value.scope === "model" && (!value.providerId || !value.modelId))
      context.addIssue({
        code: "custom",
        message: "Provider and model are required.",
        path: ["modelId"]
      });
  });

export const organizationAiPolicySchema = z.object({
  allowUnknownCost: z.boolean(),
  allowedClassifications: z.array(z.enum(aiDataClassifications)).min(1),
  allowedProviderKeys: z.array(z.enum(aiProviderKeys)).default([]),
  allowedRegions: z.array(z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/)).default([]),
  defaultTimeoutMs: z.number().int().min(1000).max(600000),
  enabled: z.boolean(),
  maxConcurrentRequests: z.number().int().min(1).max(1000),
  maxInputCharacters: z.number().int().min(1).max(1000000),
  maxOutputTokens: z.number().int().min(1).max(100000),
  organizationId: z.string().uuid(),
  piiRedactionRequired: z.boolean(),
  providerRetentionAllowed: z.boolean(),
  restrictedDataAllowed: z.boolean()
});

export const costRateSchema = z.object({
  cachedInputCostPerMillion: z.number().nonnegative().nullable(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
  inputCostPerMillion: z.number().nonnegative().nullable(),
  modelId: z.string().uuid(),
  organizationId: z.string().uuid(),
  outputCostPerMillion: z.number().nonnegative().nullable(),
  providerId: z.string().uuid(),
  sourceReferenceHash: z.string().regex(/^[a-f0-9]{64}$/)
});

export const modelRouteSchema = z.object({
  allowedClassifications: z.array(z.enum(aiDataClassifications)).min(1),
  allowedRegions: z.array(z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/)).default([]),
  capabilityKey: z.enum([...aiCapabilityKeys, "structured_output"]),
  isDefault: z.boolean(),
  latencyPreference: z.enum(["cost", "balanced", "latency"]),
  maxInputTokens: z.number().int().nonnegative(),
  maxOutputTokens: z.number().int().nonnegative(),
  maximumCostMinor: z.number().int().nonnegative().nullable(),
  modelId: z.string().uuid(),
  organizationId: z.string().uuid(),
  priority: z.number().int().min(1).max(10000),
  providerId: z.string().uuid(),
  status: z.enum(["active", "disabled", "retired"])
});

export function assertStructuredOutput(value: unknown, schema: Record<string, unknown>) {
  if (!validateSchemaNode(value, schema, 0)) throw new Error("Structured AI output is invalid.");
}

function validateSchemaNode(
  value: unknown,
  schema: Record<string, unknown>,
  depth: number
): boolean {
  if (depth > 10) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => candidate === value))
    return false;
  if (schema.type === "string") return typeof value === "string";
  if (schema.type === "number") return typeof value === "number" && Number.isFinite(value);
  if (schema.type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "null") return value === null;
  if (schema.type === "array") {
    if (!Array.isArray(value)) return false;
    const items = schema.items;
    return !isRecord(items) || value.every((item) => validateSchemaNode(item, items, depth + 1));
  }
  if (schema.type === "object" || schema.properties) {
    if (!isRecord(value)) return false;
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : [];
    if (required.some((key) => !(key in value))) return false;
    return Object.entries(properties).every(
      ([key, child]) =>
        !(key in value) || !isRecord(child) || validateSchemaNode(value[key], child, depth + 1)
    );
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
