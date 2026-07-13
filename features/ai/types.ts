export const aiCapabilityKeys = [
  "chat",
  "completion",
  "summarization",
  "classification",
  "translation",
  "recommendation",
  "question_generation",
  "rubric_assistance",
  "feedback_assistance",
  "content_assistance",
  "search_augmentation"
] as const;
export type AiCapabilityKey = (typeof aiCapabilityKeys)[number];
export type AiProviderStatus = "disabled" | "configured" | "retired";
export type AiGuardrailDecision = "allow" | "review" | "block";
export type AiProviderRequest = {
  capability: AiCapabilityKey;
  correlationId: string;
  inputClassification: "public" | "internal" | "confidential" | "restricted";
  organizationId: string;
  payload: unknown;
};
export type AiProviderResponse = {
  latencyMs: number;
  output: unknown;
  providerReferenceHash: string | null;
  usage: { inputUnits: number; outputUnits: number };
};
export type AiWorkspaceAccess = "admin" | "mentor" | "student";
