import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiWorkspaceDto } from "@/features/ai/dtos";
import {
  mapAiAuditEvent,
  mapAiBudget,
  mapAiCapability,
  mapAiConversation,
  mapAiGuardrail,
  mapAiModel,
  mapAiPrompt,
  mapAiProvider,
  mapAiUsage,
  mapAiWorkflow
} from "@/features/ai/mappers";
export class SupabaseAiRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}
  async getProviders() {
    const { data, error } = await this.client
      .from("ai_provider_catalog_projection")
      .select("id,organization_id,key,name,adapter_type,status,capabilities,updated_at,model_count")
      .eq("organization_id", this.organizationId)
      .order("name");
    return error ? [] : (data ?? []).map((row) => mapAiProvider(row as Record<string, unknown>));
  }
  async getModels() {
    const { data, error } = await this.client
      .from("ai_models")
      .select("id,organization_id,provider_id,key,name,modality,context_window,status")
      .eq("organization_id", this.organizationId)
      .order("name");
    return error ? [] : (data ?? []).map((row) => mapAiModel(row as Record<string, unknown>));
  }
  async getCapabilities() {
    const { data, error } = await this.client
      .from("ai_capabilities")
      .select("id,organization_id,key,name,category,risk_tier,enabled")
      .eq("organization_id", this.organizationId)
      .order("name");
    return error ? [] : (data ?? []).map((row) => mapAiCapability(row as Record<string, unknown>));
  }
  async getWorkflows() {
    const { data, error } = await this.client
      .from("ai_workflows")
      .select("id,organization_id,capability_id,key,name,status,human_review_required")
      .eq("organization_id", this.organizationId)
      .order("name");
    return error ? [] : (data ?? []).map((row) => mapAiWorkflow(row as Record<string, unknown>));
  }
  async getPrompts() {
    const { data, error } = await this.client
      .from("ai_prompt_catalog_projection")
      .select("id,organization_id,key,title,status,version_count,latest_version,published_at")
      .eq("organization_id", this.organizationId)
      .order("title");
    return error ? [] : (data ?? []).map((row) => mapAiPrompt(row as Record<string, unknown>));
  }
  async getGuardrails() {
    const { data, error } = await this.client
      .from("ai_guardrails")
      .select("id,organization_id,key,name,scope,enforcement,status")
      .eq("organization_id", this.organizationId)
      .order("name");
    return error ? [] : (data ?? []).map((row) => mapAiGuardrail(row as Record<string, unknown>));
  }
  async getUsage() {
    const { data, error } = await this.client
      .from("ai_usage_summary_projection")
      .select(
        "organization_id,usage_day,event_count,input_units,output_units,cost_minor,average_latency_ms"
      )
      .eq("organization_id", this.organizationId)
      .order("usage_day", { ascending: false })
      .limit(90);
    return error ? [] : (data ?? []).map((row) => mapAiUsage(row as Record<string, unknown>));
  }
  async getBudgets() {
    const { data, error } = await this.client
      .from("ai_usage_budgets")
      .select("id,organization_id,period,currency_code,budget_minor,warning_threshold,status")
      .eq("organization_id", this.organizationId)
      .order("period");
    return error ? [] : (data ?? []).map((row) => mapAiBudget(row as Record<string, unknown>));
  }
  async getConversations() {
    const { data, error } = await this.client
      .from("ai_conversation_projection")
      .select(
        "id,organization_id,profile_id,purpose,status,started_at,ended_at,expires_at,message_count"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("started_at", { ascending: false })
      .limit(50);
    return error
      ? []
      : (data ?? []).map((row) => mapAiConversation(row as Record<string, unknown>));
  }
  async getAuditEvents() {
    const { data, error } = await this.client
      .from("ai_guardrail_audit_projection")
      .select("id,organization_id,guardrail_name,event_type,severity,action,occurred_at")
      .eq("organization_id", this.organizationId)
      .order("occurred_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapAiAuditEvent(row as Record<string, unknown>));
  }
  async getWorkspace(includeAdministration = false): Promise<AiWorkspaceDto> {
    const [
      conversations,
      providers,
      models,
      capabilities,
      workflows,
      prompts,
      guardrails,
      usage,
      budgets,
      auditEvents
    ] = await Promise.all([
      this.getConversations(),
      includeAdministration ? this.getProviders() : Promise.resolve([]),
      includeAdministration ? this.getModels() : Promise.resolve([]),
      includeAdministration ? this.getCapabilities() : Promise.resolve([]),
      includeAdministration ? this.getWorkflows() : Promise.resolve([]),
      includeAdministration ? this.getPrompts() : Promise.resolve([]),
      includeAdministration ? this.getGuardrails() : Promise.resolve([]),
      includeAdministration ? this.getUsage() : Promise.resolve([]),
      includeAdministration ? this.getBudgets() : Promise.resolve([]),
      includeAdministration ? this.getAuditEvents() : Promise.resolve([])
    ]);
    return {
      auditEvents,
      budgets,
      capabilities,
      conversations,
      guardrails,
      models,
      prompts,
      providers,
      usage,
      workflows
    };
  }
}
