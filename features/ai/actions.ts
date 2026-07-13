"use server";
import { revalidatePath } from "next/cache";
import {
  costRateSchema,
  killSwitchSchema,
  modelRouteSchema,
  organizationAiPolicySchema,
  providerTestSchema
} from "@/features/ai/execution/schema";
import { testAiProviderConnection } from "@/features/ai/execution/server";
import {
  capabilitySchema,
  conversationSchema,
  guardrailSchema,
  modelSchema,
  promptTemplateSchema,
  promptVersionSchema,
  providerSchema,
  usageBudgetSchema,
  workflowSchema
} from "@/features/ai/schemas";
import { canManageAi } from "@/features/ai/permissions";
import { parseJsonObject } from "@/features/ai/validation";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";
const invalid = (parsed: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) =>
  ({ fieldErrors: parsed.error.flatten().fieldErrors, success: false }) satisfies ActionResult;
const refresh = () => {
  for (const path of [
    "/admin/ai",
    "/admin/ai/providers",
    "/admin/ai/models",
    "/admin/ai/prompts",
    "/admin/ai/guardrails",
    "/admin/ai/usage",
    "/admin/ai/budgets",
    "/admin/ai/audit",
    "/mentor/ai",
    "/student/ai",
    "/student/assistant"
  ])
    revalidatePath(path);
};
async function client(action: string) {
  await enforceServerActionSecurity(action, 20);
  return createSupabaseServerClient();
}
async function authorize(organizationId: string) {
  const identity = await resolveIdentityContext();
  return Boolean(
    identity?.organizationId === organizationId && (await canManageAi(organizationId))
  );
}
export async function registerProvider(formData: FormData): Promise<ActionResult> {
  const parsed = providerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const capabilities = parsed.data.capabilities
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const { error } = await (
    await client("ai-provider-register")
  ).rpc("register_ai_provider", {
    p_adapter_type: parsed.data.adapterType,
    p_capabilities: capabilities,
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId
  });
  if (error) return { error: "Provider registry entry could not be created.", success: false };
  refresh();
  return { message: "Provider registry entry created.", success: true };
}
export async function registerModel(formData: FormData): Promise<ActionResult> {
  const parsed = modelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("ai-model-register")
  ).rpc("register_ai_model", {
    p_context_window: parsed.data.contextWindow,
    p_key: parsed.data.key,
    p_modality: parsed.data.modality,
    p_name: parsed.data.name,
    p_provider_id: parsed.data.providerId
  });
  if (error) return { error: "Model registry entry could not be created.", success: false };
  refresh();
  return { message: "Model registry entry created.", success: true };
}
export async function registerCapability(formData: FormData): Promise<ActionResult> {
  const parsed = capabilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-capability-register")
  ).rpc("register_ai_capability", {
    p_category: parsed.data.category,
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_risk_tier: parsed.data.riskTier
  });
  if (error) return { error: "Capability could not be registered.", success: false };
  refresh();
  return { message: "Capability registered.", success: true };
}
export async function createWorkflow(formData: FormData): Promise<ActionResult> {
  const parsed = workflowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-workflow-create")
  ).rpc("create_ai_workflow", {
    p_capability_id: parsed.data.capabilityId,
    p_human_review_required: parsed.data.humanReviewRequired,
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId
  });
  if (error) return { error: "Workflow could not be created.", success: false };
  refresh();
  return { message: "Workflow draft created.", success: true };
}
export async function createPromptTemplate(formData: FormData): Promise<ActionResult> {
  const parsed = promptTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-prompt-create")
  ).rpc("create_ai_prompt_template", {
    p_key: parsed.data.key,
    p_organization_id: parsed.data.organizationId,
    p_title: parsed.data.title,
    p_workflow_id: parsed.data.workflowId
  });
  if (error) return { error: "Prompt template could not be created.", success: false };
  refresh();
  return { message: "Prompt template created.", success: true };
}
export async function savePromptVersion(formData: FormData): Promise<ActionResult> {
  const parsed = promptVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  let inputSchema: Record<string, unknown>;
  let outputSchema: Record<string, unknown>;
  try {
    inputSchema = parseJsonObject(parsed.data.inputSchema);
    outputSchema = parseJsonObject(parsed.data.outputSchema);
  } catch {
    return { error: "Prompt schemas must be JSON objects.", success: false };
  }
  const { error } = await (
    await client("ai-prompt-version")
  ).rpc("save_ai_prompt_version", {
    p_input_schema: inputSchema,
    p_output_schema: outputSchema,
    p_prompt_template_id: parsed.data.promptTemplateId,
    p_template_text: parsed.data.templateText
  });
  if (error) return { error: "Prompt version could not be saved.", success: false };
  refresh();
  return { message: "Prompt version saved.", success: true };
}
export async function configureGuardrail(formData: FormData): Promise<ActionResult> {
  const parsed = guardrailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-guardrail-configure")
  ).rpc("configure_ai_guardrail", {
    p_enforcement: parsed.data.enforcement,
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_organization_id: parsed.data.organizationId,
    p_scope: parsed.data.scope
  });
  if (error) return { error: "Guardrail could not be configured.", success: false };
  refresh();
  return { message: "Guardrail draft created.", success: true };
}
export async function setUsageBudget(formData: FormData): Promise<ActionResult> {
  const parsed = usageBudgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-budget-set")
  ).rpc("set_ai_usage_budget", {
    p_budget_minor: parsed.data.budgetMinor,
    p_currency_code: parsed.data.currencyCode,
    p_organization_id: parsed.data.organizationId,
    p_period: parsed.data.period,
    p_warning_threshold: parsed.data.warningThreshold
  });
  if (error) return { error: "Budget could not be saved.", success: false };
  refresh();
  return { message: "Budget saved.", success: true };
}
export async function createConversation(formData: FormData): Promise<ActionResult> {
  const parsed = conversationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const identity = await resolveIdentityContext();
  if (identity?.organizationId !== parsed.data.organizationId)
    return { error: "Active organization required.", success: false };
  const { error } = await (
    await client("ai-conversation-create")
  ).rpc("create_ai_conversation", {
    p_organization_id: parsed.data.organizationId,
    p_purpose: parsed.data.purpose,
    p_retention_days: parsed.data.retentionDays
  });
  if (error) return { error: "Conversation boundary could not be created.", success: false };
  refresh();
  return { message: "Conversation boundary created.", success: true };
}

export async function refreshProviderHealth(formData: FormData): Promise<ActionResult> {
  const parsed = providerTestSchema.safeParse({ provider: formData.get("provider") });
  if (!parsed.success) return invalid(parsed);
  try {
    await enforceServerActionSecurity("ai-provider-health-refresh", 3);
    const result = await testAiProviderConnection(parsed.data.provider);
    refresh();
    return {
      message: `Provider health is ${result.status}. No credentials were displayed or stored.`,
      success: true
    };
  } catch {
    return { error: "Provider connection could not be verified.", success: false };
  }
}

export async function setProviderKillSwitch(formData: FormData): Promise<ActionResult> {
  const parsed = killSwitchSchema.safeParse({
    enabled: formData.get("enabled") === "true",
    endsAt: optionalField(formData, "endsAt"),
    modelId: optionalField(formData, "modelId"),
    organizationId: formData.get("organizationId"),
    providerId: optionalField(formData, "providerId"),
    reasonCode: formData.get("reasonCode"),
    scope: formData.get("scope")
  });
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-kill-switch")
  ).rpc("set_ai_provider_kill_switch", {
    p_enabled: parsed.data.enabled,
    p_ends_at: parsed.data.endsAt,
    p_model_id: parsed.data.modelId,
    p_organization_id: parsed.data.organizationId,
    p_provider_id: parsed.data.providerId,
    p_reason_code: parsed.data.reasonCode,
    p_scope: parsed.data.scope
  });
  if (error) return { error: "Kill switch could not be updated.", success: false };
  refresh();
  return { message: "Kill switch updated.", success: true };
}

export async function setOrganizationAiPolicy(formData: FormData): Promise<ActionResult> {
  const parsed = organizationAiPolicySchema.safeParse({
    allowUnknownCost: formData.get("allowUnknownCost") === "true",
    allowedClassifications: csv(formData, "allowedClassifications"),
    allowedProviderKeys: csv(formData, "allowedProviderKeys"),
    allowedRegions: csv(formData, "allowedRegions"),
    defaultTimeoutMs: Number(formData.get("defaultTimeoutMs")),
    enabled: formData.get("enabled") === "true",
    maxConcurrentRequests: Number(formData.get("maxConcurrentRequests")),
    maxInputCharacters: Number(formData.get("maxInputCharacters")),
    maxOutputTokens: Number(formData.get("maxOutputTokens")),
    organizationId: formData.get("organizationId"),
    piiRedactionRequired: formData.get("piiRedactionRequired") === "true",
    providerRetentionAllowed: formData.get("providerRetentionAllowed") === "true",
    restrictedDataAllowed: formData.get("restrictedDataAllowed") === "true"
  });
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-execution-policy")
  ).rpc("set_organization_ai_policy", {
    p_allow_unknown_cost: parsed.data.allowUnknownCost,
    p_allowed_classifications: parsed.data.allowedClassifications,
    p_allowed_provider_keys: parsed.data.allowedProviderKeys,
    p_allowed_regions: parsed.data.allowedRegions,
    p_default_timeout_ms: parsed.data.defaultTimeoutMs,
    p_enabled: parsed.data.enabled,
    p_max_concurrent_requests: parsed.data.maxConcurrentRequests,
    p_max_input_characters: parsed.data.maxInputCharacters,
    p_max_output_tokens: parsed.data.maxOutputTokens,
    p_organization_id: parsed.data.organizationId,
    p_pii_redaction_required: parsed.data.piiRedactionRequired,
    p_provider_retention_allowed: parsed.data.providerRetentionAllowed,
    p_restricted_data_allowed: parsed.data.restrictedDataAllowed
  });
  if (error) return { error: "AI execution policy could not be saved.", success: false };
  refresh();
  return { message: "AI execution policy saved.", success: true };
}

export async function configureAiModelRoute(formData: FormData): Promise<ActionResult> {
  const parsed = modelRouteSchema.safeParse({
    allowedClassifications: csv(formData, "allowedClassifications"),
    allowedRegions: csv(formData, "allowedRegions"),
    capabilityKey: formData.get("capabilityKey"),
    isDefault: formData.get("isDefault") === "true",
    latencyPreference: formData.get("latencyPreference"),
    maxInputTokens: Number(formData.get("maxInputTokens")),
    maxOutputTokens: Number(formData.get("maxOutputTokens")),
    maximumCostMinor: optionalNumber(formData, "maximumCostMinor"),
    modelId: formData.get("modelId"),
    organizationId: formData.get("organizationId"),
    priority: Number(formData.get("priority")),
    providerId: formData.get("providerId"),
    status: formData.get("status")
  });
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-model-route")
  ).rpc("configure_ai_model_route", {
    p_allowed_classifications: parsed.data.allowedClassifications,
    p_allowed_regions: parsed.data.allowedRegions,
    p_capability_key: parsed.data.capabilityKey,
    p_is_default: parsed.data.isDefault,
    p_latency_preference: parsed.data.latencyPreference,
    p_max_input_tokens: parsed.data.maxInputTokens,
    p_max_output_tokens: parsed.data.maxOutputTokens,
    p_maximum_cost_minor: parsed.data.maximumCostMinor,
    p_model_id: parsed.data.modelId,
    p_organization_id: parsed.data.organizationId,
    p_priority: parsed.data.priority,
    p_provider_id: parsed.data.providerId,
    p_status: parsed.data.status
  });
  if (error) return { error: "AI model route could not be saved.", success: false };
  refresh();
  return { message: "AI model route saved.", success: true };
}

export async function updateAiCostRate(formData: FormData): Promise<ActionResult> {
  const parsed = costRateSchema.safeParse({
    cachedInputCostPerMillion: optionalNumber(formData, "cachedInputCostPerMillion"),
    currencyCode: formData.get("currencyCode"),
    effectiveFrom: normalizedDateTime(formData, "effectiveFrom"),
    effectiveTo: normalizedOptionalDateTime(formData, "effectiveTo"),
    inputCostPerMillion: optionalNumber(formData, "inputCostPerMillion"),
    modelId: formData.get("modelId"),
    organizationId: formData.get("organizationId"),
    outputCostPerMillion: optionalNumber(formData, "outputCostPerMillion"),
    providerId: formData.get("providerId"),
    sourceReferenceHash: formData.get("sourceReferenceHash")
  });
  if (!parsed.success) return invalid(parsed);
  if (!(await authorize(parsed.data.organizationId)))
    return { error: "AI administration permission required.", success: false };
  const { error } = await (
    await client("ai-cost-rate")
  ).rpc("update_ai_cost_rate", {
    p_cached_input_cost_per_million: parsed.data.cachedInputCostPerMillion,
    p_currency_code: parsed.data.currencyCode,
    p_effective_from: parsed.data.effectiveFrom,
    p_effective_to: parsed.data.effectiveTo,
    p_input_cost_per_million: parsed.data.inputCostPerMillion,
    p_model_id: parsed.data.modelId,
    p_organization_id: parsed.data.organizationId,
    p_output_cost_per_million: parsed.data.outputCostPerMillion,
    p_provider_id: parsed.data.providerId,
    p_source_reference_hash: parsed.data.sourceReferenceHash
  });
  if (error) return { error: "AI cost rate could not be recorded.", success: false };
  refresh();
  return { message: "AI cost rate recorded as immutable configuration.", success: true };
}

function csv(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function optionalField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function optionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : null;
}

function normalizedDateTime(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? new Date(value).toISOString() : value;
}

function normalizedOptionalDateTime(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? new Date(value).toISOString() : null;
}
