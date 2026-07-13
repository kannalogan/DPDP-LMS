import type { AiCapabilityKey } from "@/features/ai/types";

export const aiProviderKeys = ["openai", "anthropic", "gemini"] as const;
export type AiProviderKey = (typeof aiProviderKeys)[number];

export const aiDataClassifications = [
  "public",
  "internal",
  "confidential",
  "restricted",
  "pii",
  "sensitive_personal_data"
] as const;
export type AiDataClassification = (typeof aiDataClassifications)[number];

export type AiExecutionCapability = AiCapabilityKey | "structured_output";

export type AiMessage = {
  content: string;
  role: "assistant" | "user";
};

export type AiResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { name: string; schema: Record<string, unknown>; type: "json_schema" };

export type AiActorContext = {
  organizationId: string;
  profileId: string;
};

export type NormalizedAiRequest = {
  actor: AiActorContext;
  capability: AiExecutionCapability;
  dataClassification: AiDataClassification;
  idempotencyKey: string;
  maximumOutputTokens: number;
  messages: AiMessage[];
  metadata: Record<string, boolean | number | string>;
  model: string;
  provider: AiProviderKey;
  responseFormat: AiResponseFormat;
  systemInstructions: string;
  temperature: number;
  timeoutMs: number;
  traceId: string;
};

export type NormalizedAiResponse = {
  cacheState: "bypass" | "hit" | "miss";
  costEstimateMinor: number | null;
  finishReason: string;
  inputTokens: number;
  latencyMs: number;
  model: string;
  outputText: string;
  outputTokens: number;
  provider: AiProviderKey;
  providerRequestId: string | null;
  redactionMetadata: { categories: string[]; count: number };
  safetyMetadata: { codes: string[] };
  structuredOutput: unknown | null;
  totalTokens: number;
};

export type AiProviderHealthResult = {
  accountReference: string | null;
  latencyMs: number;
  region: string;
  status: "degraded" | "healthy" | "unavailable";
};

export type AiProviderAdapter = {
  healthCheck(signal: AbortSignal): Promise<AiProviderHealthResult>;
  invoke(request: NormalizedAiRequest, signal: AbortSignal): Promise<NormalizedAiResponse>;
  readonly key: AiProviderKey;
  supports(capability: AiExecutionCapability): boolean;
};

export type AiExecutionInput = {
  capability: AiExecutionCapability;
  dataClassification: AiDataClassification;
  idempotencyKey: string;
  maximumOutputTokens?: number;
  messages: AiMessage[];
  metadata?: Record<string, boolean | number | string>;
  model?: string;
  provider?: AiProviderKey;
  responseFormat?: AiResponseFormat;
  systemInstructions?: string;
  temperature?: number;
  timeoutMs?: number;
  traceId?: string;
};

export type AiExecutionResult = NormalizedAiResponse & {
  executionId: string;
  traceId: string;
};

export type AiExecutionPolicy = {
  allowUnknownCost: boolean;
  allowedClassifications: AiDataClassification[];
  allowedProviderKeys: string[];
  allowedRegions: string[];
  defaultTimeoutMs: number;
  enabled: boolean;
  maxConcurrentRequests: number;
  maxInputCharacters: number;
  maxOutputTokens: number;
  piiRedactionRequired: boolean;
  providerRetentionAllowed: boolean;
  restrictedDataAllowed: boolean;
  version: number;
};

export type AiModelRoute = {
  allowedClassifications: AiDataClassification[];
  allowedRegions: string[];
  capabilityKey: string;
  circuitState: "closed" | "half_open" | "open" | null;
  healthStatus: "degraded" | "disabled" | "healthy" | "unavailable" | "unknown" | null;
  id: string;
  isDefault: boolean;
  killSwitchEnabled: boolean;
  latencyPreference: "balanced" | "cost" | "latency";
  maxInputTokens: number;
  maxOutputTokens: number;
  maximumCostMinor: number | null;
  modelId: string;
  modelKey: string;
  priority: number;
  providerId: string;
  providerKey: AiProviderKey;
  region: string;
};

export type AiFallbackRule = {
  allowRegionCrossing: boolean;
  failureClasses: string[];
  fallbackRouteId: string;
  maximumAdditionalAttempts: number;
  primaryRouteId: string;
  priority: number;
};

export type AiCostRate = {
  cachedInputCostPerMillion: number | null;
  currencyCode: string;
  inputCostPerMillion: number | null;
  modelId: string;
  outputCostPerMillion: number | null;
  providerId: string;
};

export type AiExecutionContext = {
  activeExecutions: number;
  costRates: AiCostRate[];
  fallbackRules: AiFallbackRule[];
  policy: AiExecutionPolicy | null;
  routes: AiModelRoute[];
};

export type AiAttemptEvidence = {
  attemptNumber: number;
  completedAt: Date;
  failureClass: string | null;
  fallbackFromAttemptId: string | null;
  latencyMs: number;
  providerRequestIdHash: string | null;
  retryable: boolean;
  route: AiModelRoute;
  startedAt: Date;
  status: "blocked" | "cancelled" | "completed" | "failed" | "timed_out";
};
