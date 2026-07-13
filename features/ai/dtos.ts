export type AiProviderDto = {
  adapterType: string;
  capabilities: string[];
  id: string;
  key: string;
  modelCount: number;
  name: string;
  status: string;
  updatedAt: string;
};
export type AiModelDto = {
  contextWindow: number;
  id: string;
  key: string;
  modality: string;
  name: string;
  providerId: string;
  status: string;
};
export type AiCapabilityDto = {
  category: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  riskTier: string;
};
export type AiWorkflowDto = {
  capabilityId: string;
  humanReviewRequired: boolean;
  id: string;
  key: string;
  name: string;
  status: string;
};
export type AiPromptDto = {
  id: string;
  key: string;
  latestVersion: number | null;
  publishedAt: string | null;
  status: string;
  title: string;
  versionCount: number;
};
export type AiGuardrailDto = {
  enforcement: string;
  id: string;
  key: string;
  name: string;
  scope: string;
  status: string;
};
export type AiUsageDto = {
  averageLatencyMs: number;
  costMinor: number;
  eventCount: number;
  inputUnits: number;
  outputUnits: number;
  usageDay: string;
};
export type AiBudgetDto = {
  budgetMinor: number;
  currencyCode: string;
  id: string;
  period: string;
  status: string;
  warningThreshold: number;
};
export type AiConversationDto = {
  endedAt: string | null;
  expiresAt: string;
  id: string;
  messageCount: number;
  purpose: string;
  startedAt: string;
  status: string;
};
export type AiAuditEventDto = {
  action: string;
  eventType: string;
  guardrailName: string | null;
  id: string;
  occurredAt: string;
  severity: string;
};
export type AiWorkspaceDto = {
  auditEvents: AiAuditEventDto[];
  budgets: AiBudgetDto[];
  capabilities: AiCapabilityDto[];
  conversations: AiConversationDto[];
  guardrails: AiGuardrailDto[];
  models: AiModelDto[];
  prompts: AiPromptDto[];
  providers: AiProviderDto[];
  usage: AiUsageDto[];
  workflows: AiWorkflowDto[];
};
