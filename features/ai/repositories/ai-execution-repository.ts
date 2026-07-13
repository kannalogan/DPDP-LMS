import type { SupabaseClient } from "@supabase/supabase-js";
import { AiExecutionError } from "@/features/ai/errors";
import type {
  AiAttemptEvidence,
  AiCostRate,
  AiDataClassification,
  AiExecutionContext,
  AiExecutionPolicy,
  AiFallbackRule,
  AiModelRoute,
  AiProviderKey
} from "@/features/ai/execution/types";
import type { RedactionEvidence } from "@/features/ai/redaction/redactor";

type BeginExecution = {
  capabilityKey: string;
  estimatedInputTokens: number;
  expiresAt: string;
  idempotencyKeyHash: string;
  inputClassification: AiDataClassification;
  maximumOutputTokens: number;
  messageCount: number;
  modelId: string | null;
  organizationId: string;
  providerId: string | null;
  requestHash: string;
  retentionCategory: string;
  systemInstructionHash: string | null;
  traceId: string;
};

export type AiExecutionAdminOverview = {
  audit: Array<{
    capability: string;
    completedAt: string | null;
    costMinor: number | null;
    failures: number;
    id: string;
    latencyMs: number | null;
    redactions: number;
    status: string;
    traceId: string;
  }>;
  health: Array<{
    circuitState: string;
    configured: boolean;
    enabled: boolean;
    healthStatus: string;
    killSwitchEnabled: boolean;
    latencyMs: number | null;
    lastCheckedAt: string | null;
    providerId: string;
    providerKey: string;
    providerName: string;
    region: string;
  }>;
  policy: AiExecutionPolicy | null;
  routes: AiModelRoute[];
};

export class AiExecutionRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}

  async getContext(capability: string): Promise<AiExecutionContext> {
    const [policy, routes, fallbackRules, costRates, activeExecutions] = await Promise.all([
      this.getPolicy(),
      this.getRoutes(capability),
      this.getFallbackRules(),
      this.getCostRates(),
      this.getActiveExecutionCount()
    ]);
    return { activeExecutions, costRates, fallbackRules, policy, routes };
  }

  async getPolicy(): Promise<AiExecutionPolicy | null> {
    const { data, error } = await this.client
      .from("ai_execution_policies")
      .select(
        "enabled,allowed_provider_keys,allowed_classifications,allowed_regions,restricted_data_allowed,pii_redaction_required,provider_retention_allowed,allow_unknown_cost,max_input_characters,max_output_tokens,max_concurrent_requests,default_timeout_ms,version,status"
      )
      .eq("organization_id", this.organizationId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      allowUnknownCost: Boolean(row.allow_unknown_cost),
      allowedClassifications: strings(row.allowed_classifications) as AiDataClassification[],
      allowedProviderKeys: strings(row.allowed_provider_keys),
      allowedRegions: strings(row.allowed_regions),
      defaultTimeoutMs: integer(row.default_timeout_ms),
      enabled: Boolean(row.enabled),
      maxConcurrentRequests: integer(row.max_concurrent_requests),
      maxInputCharacters: integer(row.max_input_characters),
      maxOutputTokens: integer(row.max_output_tokens),
      piiRedactionRequired: Boolean(row.pii_redaction_required),
      providerRetentionAllowed: Boolean(row.provider_retention_allowed),
      restrictedDataAllowed: Boolean(row.restricted_data_allowed),
      version: integer(row.version)
    };
  }

  async getProviderByKey(providerKey: AiProviderKey) {
    const { data, error } = await this.client
      .from("ai_provider_catalog_projection")
      .select("id,key,status")
      .eq("organization_id", this.organizationId)
      .eq("key", providerKey)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: String(data.id),
      key: String(data.key) as AiProviderKey,
      status: String(data.status)
    };
  }

  async getRoutes(capability?: string): Promise<AiModelRoute[]> {
    let query = this.client
      .from("ai_model_route_projection")
      .select(
        "id,organization_id,capability_key,priority,status,is_default,max_input_tokens,max_output_tokens,maximum_cost_minor,latency_preference,allowed_classifications,allowed_regions,provider_id,provider_key,model_id,model_key,health_status,region,circuit_state,kill_switch_enabled"
      )
      .eq("organization_id", this.organizationId)
      .eq("status", "active");
    if (capability) query = query.eq("capability_key", capability);
    const { data, error } = await query.order("priority");
    return error ? [] : (data ?? []).map((row) => mapRoute(row as Record<string, unknown>));
  }

  async getFallbackRules(): Promise<AiFallbackRule[]> {
    const { data, error } = await this.client
      .from("ai_provider_fallback_rules")
      .select(
        "primary_route_id,fallback_route_id,priority,failure_classes,allow_region_crossing,maximum_additional_attempts"
      )
      .eq("organization_id", this.organizationId)
      .eq("status", "active")
      .order("priority");
    return error
      ? []
      : (data ?? []).map((row) => {
          const value = row as Record<string, unknown>;
          return {
            allowRegionCrossing: Boolean(value.allow_region_crossing),
            failureClasses: strings(value.failure_classes),
            fallbackRouteId: String(value.fallback_route_id),
            maximumAdditionalAttempts: integer(value.maximum_additional_attempts),
            primaryRouteId: String(value.primary_route_id),
            priority: integer(value.priority)
          };
        });
  }

  async getCostRates(): Promise<AiCostRate[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("ai_cost_rates")
      .select(
        "provider_id,model_id,currency_code,input_cost_per_million,output_cost_per_million,cached_input_cost_per_million,effective_from,effective_to"
      )
      .eq("organization_id", this.organizationId)
      .eq("status", "active")
      .lte("effective_from", now)
      .or(`effective_to.is.null,effective_to.gt.${now}`)
      .order("effective_from", { ascending: false });
    return error
      ? []
      : (data ?? []).map((row) => {
          const value = row as Record<string, unknown>;
          return {
            cachedInputCostPerMillion: nullableNumber(value.cached_input_cost_per_million),
            currencyCode: String(value.currency_code),
            inputCostPerMillion: nullableNumber(value.input_cost_per_million),
            modelId: String(value.model_id),
            outputCostPerMillion: nullableNumber(value.output_cost_per_million),
            providerId: String(value.provider_id)
          };
        });
  }

  async findDuplicate(idempotencyKeyHash: string) {
    const { data } = await this.client
      .from("ai_execution_requests")
      .select("id,status")
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .eq("idempotency_key_hash", idempotencyKeyHash)
      .maybeSingle();
    return data ? { id: String(data.id), status: String(data.status) } : null;
  }

  async getActiveExecutionCount() {
    const { count } = await this.client
      .from("ai_execution_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .in("status", ["accepted", "reserved", "running"]);
    return count ?? 0;
  }

  async beginExecution(input: BeginExecution) {
    const { data, error } = await this.client.rpc("begin_ai_execution", {
      p_capability_key: input.capabilityKey,
      p_estimated_input_tokens: input.estimatedInputTokens,
      p_expires_at: input.expiresAt,
      p_idempotency_key_hash: input.idempotencyKeyHash,
      p_input_classification: input.inputClassification,
      p_maximum_output_tokens: input.maximumOutputTokens,
      p_message_count: input.messageCount,
      p_organization_id: input.organizationId,
      p_prompt_version_id: null,
      p_request_hash: input.requestHash,
      p_requested_model_id: input.modelId,
      p_requested_provider_id: input.providerId,
      p_retention_category: input.retentionCategory,
      p_system_instruction_hash: input.systemInstructionHash,
      p_trace_id: input.traceId,
      p_workflow_id: null
    });
    return requiredId(data, error);
  }

  async reserveBudget(executionId: string, amountMinor: number, currencyCode: string) {
    const { error } = await this.client.rpc("reserve_ai_budget", {
      p_currency_code: currencyCode,
      p_execution_request_id: executionId,
      p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      p_reserved_minor: amountMinor
    });
    if (error)
      throw new AiExecutionError(error.code === "P0001" ? "budget_exceeded" : "unavailable");
  }

  async recordDecision(
    executionId: string,
    phase: string,
    decision: string,
    reasonCodes: string[],
    policyVersion: number | null
  ) {
    const { error } = await this.client.rpc("record_ai_execution_policy_decision", {
      p_decision: decision,
      p_execution_request_id: executionId,
      p_guardrail_ids: [],
      p_phase: phase,
      p_policy_version: policyVersion,
      p_reason_codes: reasonCodes
    });
    if (error) throw new AiExecutionError("unavailable");
  }

  async recordRedactions(
    executionId: string,
    direction: "input" | "output",
    evidence: RedactionEvidence[]
  ) {
    for (const item of evidence) {
      const { error } = await this.client.rpc("record_ai_execution_redaction", {
        p_category: item.category,
        p_content_hash_after: item.contentHashAfter,
        p_content_hash_before: item.contentHashBefore,
        p_direction: direction,
        p_execution_request_id: executionId,
        p_occurrence_count: item.count,
        p_strategy: item.strategy
      });
      if (error) throw new AiExecutionError("unavailable");
    }
  }

  async recordAttempt(executionId: string, evidence: AiAttemptEvidence) {
    const { data, error } = await this.client.rpc("record_ai_execution_attempt", {
      p_attempt_number: evidence.attemptNumber,
      p_completed_at: evidence.completedAt.toISOString(),
      p_execution_request_id: executionId,
      p_failure_class: evidence.failureClass,
      p_fallback_from_attempt_id: evidence.fallbackFromAttemptId,
      p_latency_ms: evidence.latencyMs,
      p_model_id: evidence.route.modelId,
      p_provider_id: evidence.route.providerId,
      p_provider_request_id_hash: evidence.providerRequestIdHash,
      p_region: evidence.route.region,
      p_retryable: evidence.retryable,
      p_route_id: evidence.route.id,
      p_started_at: evidence.startedAt.toISOString(),
      p_status: evidence.status
    });
    return requiredId(data, error);
  }

  async completeExecution(options: {
    attemptId: string;
    cachedTokens: number;
    cacheState: string;
    costMinor: number | null;
    currencyCode: string | null;
    executionId: string;
    finishReason: string;
    inputTokens: number;
    latencyMs: number;
    outputHash: string;
    outputTokens: number;
    redactionCount: number;
    route: AiModelRoute;
    safetyCodes: string[];
    structuredOutputHash: string | null;
  }) {
    const { error } = await this.client.rpc("complete_ai_execution", {
      p_cache_state: options.cacheState,
      p_cached_tokens: options.cachedTokens,
      p_cost_minor: options.costMinor,
      p_currency_code: options.currencyCode,
      p_execution_attempt_id: options.attemptId,
      p_execution_request_id: options.executionId,
      p_finish_reason: options.finishReason,
      p_input_tokens: options.inputTokens,
      p_latency_ms: options.latencyMs,
      p_model_id: options.route.modelId,
      p_output_hash: options.outputHash,
      p_output_tokens: options.outputTokens,
      p_provider_id: options.route.providerId,
      p_redaction_count: options.redactionCount,
      p_safety_codes: options.safetyCodes,
      p_structured_output_hash: options.structuredOutputHash
    });
    if (error) throw new AiExecutionError("unavailable");
  }

  async failExecution(options: {
    attemptId: string | null;
    errorFingerprintHash: string;
    executionId: string;
    failureClass: string;
    httpStatus: number | null;
    providerCode: string | null;
    retryable: boolean;
    terminal: boolean;
  }) {
    const { error } = await this.client.rpc("fail_ai_execution", {
      p_error_fingerprint_hash: options.errorFingerprintHash,
      p_execution_attempt_id: options.attemptId,
      p_execution_request_id: options.executionId,
      p_failure_class: options.failureClass,
      p_http_status: options.httpStatus,
      p_provider_error_code: options.providerCode,
      p_retryable: options.retryable,
      p_terminal: options.terminal
    });
    if (error) throw new AiExecutionError("unavailable");
  }

  async recordHealth(options: {
    accountReferenceHash: string | null;
    latencyMs: number;
    providerId: string;
    region: string;
    status: string;
    success: boolean;
  }) {
    const { error } = await this.client.rpc("record_ai_provider_health", {
      p_account_reference_hash: options.accountReferenceHash,
      p_latency_ms: options.latencyMs,
      p_organization_id: this.organizationId,
      p_provider_id: options.providerId,
      p_region: options.region,
      p_status: options.status,
      p_success: options.success
    });
    if (error) throw new AiExecutionError("unavailable");
  }

  async getAdminOverview(
    providerConfiguration: Array<{ configured: boolean; enabled: boolean; provider: AiProviderKey }>
  ): Promise<AiExecutionAdminOverview> {
    const [healthResult, routes, auditResult, policy] = await Promise.all([
      this.client
        .from("ai_provider_execution_status_projection")
        .select(
          "provider_id,organization_id,key,name,registry_status,health_status,region,latency_ms,checked_at,circuit_state,kill_switch_enabled"
        )
        .eq("organization_id", this.organizationId)
        .order("name"),
      this.getRoutes(),
      this.client
        .from("ai_execution_audit_projection")
        .select(
          "id,organization_id,trace_id,capability_key,status,completed_at,latency_ms,cost_minor,redaction_count,failure_count"
        )
        .eq("organization_id", this.organizationId)
        .order("accepted_at", { ascending: false })
        .limit(100),
      this.getPolicy()
    ]);
    const configuration = new Map(providerConfiguration.map((item) => [item.provider, item]));
    return {
      audit: (auditResult.data ?? []).map((row) => ({
        capability: String(row.capability_key),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        costMinor: nullableNumber(row.cost_minor),
        failures: integer(row.failure_count),
        id: String(row.id),
        latencyMs: nullableNumber(row.latency_ms),
        redactions: integer(row.redaction_count),
        status: String(row.status),
        traceId: String(row.trace_id)
      })),
      health: (healthResult.data ?? []).map((row) => {
        const key = String(row.key) as AiProviderKey;
        const state = configuration.get(key);
        return {
          circuitState: String(row.circuit_state ?? "closed"),
          configured: state?.configured ?? false,
          enabled: state?.enabled ?? false,
          healthStatus: String(row.health_status ?? "unknown"),
          killSwitchEnabled: Boolean(row.kill_switch_enabled),
          latencyMs: nullableNumber(row.latency_ms),
          lastCheckedAt: row.checked_at ? String(row.checked_at) : null,
          providerId: String(row.provider_id),
          providerKey: key,
          providerName: String(row.name),
          region: String(row.region ?? "unspecified")
        };
      }),
      policy,
      routes
    };
  }
}

function mapRoute(row: Record<string, unknown>): AiModelRoute {
  return {
    allowedClassifications: strings(row.allowed_classifications) as AiDataClassification[],
    allowedRegions: strings(row.allowed_regions),
    capabilityKey: String(row.capability_key),
    circuitState: nullableString(row.circuit_state) as AiModelRoute["circuitState"],
    healthStatus: nullableString(row.health_status) as AiModelRoute["healthStatus"],
    id: String(row.id),
    isDefault: Boolean(row.is_default),
    killSwitchEnabled: Boolean(row.kill_switch_enabled),
    latencyPreference: String(row.latency_preference) as AiModelRoute["latencyPreference"],
    maxInputTokens: integer(row.max_input_tokens),
    maxOutputTokens: integer(row.max_output_tokens),
    maximumCostMinor: nullableNumber(row.maximum_cost_minor),
    modelId: String(row.model_id),
    modelKey: String(row.model_key),
    priority: integer(row.priority),
    providerId: String(row.provider_id),
    providerKey: String(row.provider_key) as AiProviderKey,
    region: String(row.region ?? "unspecified")
  };
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function integer(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function requiredId(data: unknown, error: { code?: string } | null) {
  if (error || typeof data !== "string") throw new AiExecutionError("unavailable");
  return data;
}
