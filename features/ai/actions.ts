"use server";
import { revalidatePath } from "next/cache";
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
