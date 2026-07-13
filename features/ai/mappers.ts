import type {
  AiAuditEventDto,
  AiBudgetDto,
  AiCapabilityDto,
  AiConversationDto,
  AiGuardrailDto,
  AiModelDto,
  AiPromptDto,
  AiProviderDto,
  AiUsageDto,
  AiWorkflowDto
} from "@/features/ai/dtos";
const text = (value: unknown) => (typeof value === "string" ? value : "");
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
export const mapAiProvider = (row: Record<string, unknown>): AiProviderDto => ({
  adapterType: text(row.adapter_type),
  capabilities: strings(row.capabilities),
  id: text(row.id),
  key: text(row.key),
  modelCount: number(row.model_count),
  name: text(row.name),
  status: text(row.status),
  updatedAt: text(row.updated_at)
});
export const mapAiModel = (row: Record<string, unknown>): AiModelDto => ({
  contextWindow: number(row.context_window),
  id: text(row.id),
  key: text(row.key),
  modality: text(row.modality),
  name: text(row.name),
  providerId: text(row.provider_id),
  status: text(row.status)
});
export const mapAiCapability = (row: Record<string, unknown>): AiCapabilityDto => ({
  category: text(row.category),
  enabled: row.enabled === true,
  id: text(row.id),
  key: text(row.key),
  name: text(row.name),
  riskTier: text(row.risk_tier)
});
export const mapAiWorkflow = (row: Record<string, unknown>): AiWorkflowDto => ({
  capabilityId: text(row.capability_id),
  humanReviewRequired: row.human_review_required === true,
  id: text(row.id),
  key: text(row.key),
  name: text(row.name),
  status: text(row.status)
});
export const mapAiPrompt = (row: Record<string, unknown>): AiPromptDto => ({
  id: text(row.id),
  key: text(row.key),
  latestVersion: row.latest_version == null ? null : number(row.latest_version),
  publishedAt: nullableText(row.published_at),
  status: text(row.status),
  title: text(row.title),
  versionCount: number(row.version_count)
});
export const mapAiGuardrail = (row: Record<string, unknown>): AiGuardrailDto => ({
  enforcement: text(row.enforcement),
  id: text(row.id),
  key: text(row.key),
  name: text(row.name),
  scope: text(row.scope),
  status: text(row.status)
});
export const mapAiUsage = (row: Record<string, unknown>): AiUsageDto => ({
  averageLatencyMs: number(row.average_latency_ms),
  costMinor: number(row.cost_minor),
  eventCount: number(row.event_count),
  inputUnits: number(row.input_units),
  outputUnits: number(row.output_units),
  usageDay: text(row.usage_day)
});
export const mapAiBudget = (row: Record<string, unknown>): AiBudgetDto => ({
  budgetMinor: number(row.budget_minor),
  currencyCode: text(row.currency_code),
  id: text(row.id),
  period: text(row.period),
  status: text(row.status),
  warningThreshold: number(row.warning_threshold)
});
export const mapAiConversation = (row: Record<string, unknown>): AiConversationDto => ({
  endedAt: nullableText(row.ended_at),
  expiresAt: text(row.expires_at),
  id: text(row.id),
  messageCount: number(row.message_count),
  purpose: text(row.purpose),
  startedAt: text(row.started_at),
  status: text(row.status)
});
export const mapAiAuditEvent = (row: Record<string, unknown>): AiAuditEventDto => ({
  action: text(row.action),
  eventType: text(row.event_type),
  guardrailName: nullableText(row.guardrail_name),
  id: text(row.id),
  occurredAt: text(row.occurred_at),
  severity: text(row.severity)
});
