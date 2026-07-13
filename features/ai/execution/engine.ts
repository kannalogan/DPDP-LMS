import { AiExecutionAdapterRegistry } from "@/features/ai/adapters/registry";
import { estimateAiCostMinor } from "@/features/ai/cost/calculator";
import { AiExecutionError, sanitizeProviderCode } from "@/features/ai/errors";
import { assertStructuredOutput } from "@/features/ai/execution/schema";
import type {
  AiAttemptEvidence,
  AiCostRate,
  AiExecutionInput,
  AiExecutionResult,
  AiModelRoute,
  AiProviderKey,
  NormalizedAiRequest,
  NormalizedAiResponse
} from "@/features/ai/execution/types";
import { enforceExecutionPolicy, classifyOutput } from "@/features/ai/policies/execution-policy";
import { redactSensitiveText, protectSystemInstructions } from "@/features/ai/redaction/redactor";
import type { AiExecutionRepository } from "@/features/ai/repositories/ai-execution-repository";
import { AiCircuitBreaker } from "@/features/ai/resilience/circuit-breaker";
import {
  executeWithRetry,
  RetryExhaustedError,
  type RetryAttempt
} from "@/features/ai/resilience/retry";
import { resolveAiRoute, resolveFallbackRoutes } from "@/features/ai/routing/router";
import type { AiServerConfig } from "@/features/ai/secrets/schema";
import { estimateRequestTokens } from "@/features/ai/token-manager";
import { sha256 } from "@/lib/security/request";

type RouteExecution = {
  attempts: RetryAttempt<NormalizedAiResponse>[];
  response: NormalizedAiResponse;
  route: AiModelRoute;
};

export class AiExecutionEngine {
  constructor(
    private readonly repository: AiExecutionRepository,
    private readonly registry: AiExecutionAdapterRegistry,
    private readonly config: AiServerConfig,
    private readonly circuitBreaker = new AiCircuitBreaker()
  ) {}

  async execute(
    input: AiExecutionInput,
    actor: { organizationId: string; profileId: string }
  ): Promise<AiExecutionResult> {
    if (this.config.globalKillSwitch) throw new AiExecutionError("kill_switch");
    const context = await this.repository.getContext(input.capability);
    const policy = context.policy;
    if (!policy) throw new AiExecutionError("unavailable");
    enforceExecutionPolicy(input, policy);
    if (context.activeExecutions >= policy.maxConcurrentRequests)
      throw new AiExecutionError("rate_limited");

    const availableProviders = new Set(
      this.registry
        .status()
        .filter((item) => item.available)
        .map((item) => item.provider)
    );
    const allowedRoutes = context.routes
      .filter(
        (route) =>
          policy.allowedProviderKeys.length === 0 ||
          policy.allowedProviderKeys.includes(route.providerKey)
      )
      .filter(
        (route) =>
          policy.allowedRegions.length === 0 ||
          route.allowedRegions.length === 0 ||
          route.allowedRegions.some((region) => policy.allowedRegions.includes(region))
      );
    const primaryRoute = resolveAiRoute({
      availableProviders,
      defaultModel: this.config.defaultModel,
      defaultProvider: this.config.defaultProvider,
      input,
      routes: allowedRoutes
    });
    const protectedSystem = protectSystemInstructions(input.systemInstructions ?? "");
    const estimatedInputTokens = estimateRequestTokens(protectedSystem, input.messages);
    const maximumOutputTokens = input.maximumOutputTokens ?? policy.maxOutputTokens;
    if (primaryRoute.maxInputTokens > 0 && estimatedInputTokens > primaryRoute.maxInputTokens)
      throw new AiExecutionError("validation");
    if (primaryRoute.maxOutputTokens > 0 && maximumOutputTokens > primaryRoute.maxOutputTokens)
      throw new AiExecutionError("validation");

    const traceId = input.traceId ?? crypto.randomUUID();
    const idempotencyKeyHash = await sha256(input.idempotencyKey);
    const duplicate = await this.repository.findDuplicate(idempotencyKeyHash);
    if (duplicate) throw new AiExecutionError("invalid_request", { status: 409 });
    const requestHash = await sha256(
      JSON.stringify({
        capability: input.capability,
        classification: input.dataClassification,
        messages: input.messages,
        responseFormat: input.responseFormat ?? { type: "text" },
        systemInstructions: input.systemInstructions ?? ""
      })
    );
    const executionId = await this.repository.beginExecution({
      capabilityKey: input.capability,
      estimatedInputTokens,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
      idempotencyKeyHash,
      inputClassification: input.dataClassification,
      maximumOutputTokens,
      messageCount: input.messages.length,
      modelId: primaryRoute.modelId,
      organizationId: actor.organizationId,
      providerId: primaryRoute.providerId,
      requestHash,
      retentionCategory: "ai_execution_standard",
      systemInstructionHash: await sha256(protectedSystem),
      traceId
    });

    try {
      await this.repository.recordDecision(
        executionId,
        "request",
        "allow",
        ["policy_allowed"],
        policy.version
      );
      const sanitized = await this.sanitizeInput(executionId, protectedSystem, input.messages);
      const rate = findRate(context.costRates, primaryRoute);
      const reservedCost = estimateAiCostMinor(rate, estimatedInputTokens, maximumOutputTokens);
      if (reservedCost === null && !policy.allowUnknownCost)
        throw new AiExecutionError("budget_exceeded");
      if (
        primaryRoute.maximumCostMinor !== null &&
        reservedCost !== null &&
        reservedCost > primaryRoute.maximumCostMinor
      )
        throw new AiExecutionError("budget_exceeded");
      await this.repository.reserveBudget(
        executionId,
        reservedCost ?? 0,
        rate?.currencyCode ?? "INR"
      );
      await this.repository.recordDecision(
        executionId,
        "budget",
        "allow",
        ["budget_reserved"],
        policy.version
      );

      const normalized: NormalizedAiRequest = {
        actor,
        capability: input.capability,
        dataClassification: input.dataClassification,
        idempotencyKey: input.idempotencyKey,
        maximumOutputTokens,
        messages: sanitized.messages,
        metadata: input.metadata ?? {},
        model: primaryRoute.modelKey,
        provider: primaryRoute.providerKey,
        responseFormat: input.responseFormat ?? { type: "text" },
        systemInstructions: sanitized.systemInstructions,
        temperature: input.temperature ?? 0.2,
        timeoutMs: Math.min(
          input.timeoutMs ?? policy.defaultTimeoutMs,
          this.config.requestTimeoutMs
        ),
        traceId
      };

      const routeExecution = await this.executeWithFallback({
        context,
        executionId,
        normalized,
        primaryRoute,
        reservedCost
      });
      const finalized = await this.finalizeOutput(
        executionId,
        routeExecution,
        input,
        findRate(context.costRates, routeExecution.route)
      );
      return { ...finalized, executionId, traceId };
    } catch (error) {
      const normalized =
        error instanceof AiExecutionError ? error : new AiExecutionError("unavailable");
      await this.recordTerminalFailure(executionId, normalized);
      throw normalized;
    }
  }

  private async sanitizeInput(
    executionId: string,
    systemInstructions: string,
    messages: AiExecutionInput["messages"]
  ) {
    const system = await redactSensitiveText(systemInstructions);
    await this.repository.recordRedactions(executionId, "input", system.evidence);
    const sanitizedMessages = [];
    for (const message of messages) {
      const redacted = await redactSensitiveText(message.content);
      await this.repository.recordRedactions(executionId, "input", redacted.evidence);
      sanitizedMessages.push({ ...message, content: redacted.text });
    }
    return { messages: sanitizedMessages, systemInstructions: system.text };
  }

  private async executeWithFallback(options: {
    context: Awaited<ReturnType<AiExecutionRepository["getContext"]>>;
    executionId: string;
    normalized: NormalizedAiRequest;
    primaryRoute: AiModelRoute;
    reservedCost: number | null;
  }) {
    let route = options.primaryRoute;
    let fallbackFromAttemptId: string | null = null;
    let globalAttempt = 0;
    let routeMaxRetries = this.config.maxRetries;
    const visited = new Set<string>();
    while (!visited.has(route.id)) {
      visited.add(route.id);
      try {
        const execution = await this.invokeRoute(route, options.normalized, routeMaxRetries);
        const persisted = await this.persistAttempts(
          options.executionId,
          route,
          execution.attempts,
          globalAttempt,
          fallbackFromAttemptId
        );
        this.circuitBreaker.recordSuccess(
          circuitKey(options.normalized.actor.organizationId, route.providerKey)
        );
        await this.repository.recordHealth({
          accountReferenceHash: null,
          latencyMs: execution.response.latencyMs,
          providerId: route.providerId,
          region: route.region,
          status: "healthy",
          success: true
        });
        return { ...execution, route, successfulAttemptId: persisted.lastAttemptId };
      } catch (error) {
        if (!(error instanceof RetryExhaustedError)) throw error;
        const lastError = [...error.attempts].reverse().find((attempt) => attempt.error)?.error;
        const normalizedError = lastError ?? new AiExecutionError("unavailable");
        const fallback = resolveFallbackRoutes(
          route,
          options.context.routes,
          options.context.fallbackRules,
          normalizedError.failureClass
        ).find((candidate) => {
          const candidateRate = findRate(options.context.costRates, candidate.route);
          const candidateCost = estimateAiCostMinor(
            candidateRate,
            estimateRequestTokens(
              options.normalized.systemInstructions,
              options.normalized.messages
            ),
            options.normalized.maximumOutputTokens
          );
          return (
            !visited.has(candidate.route.id) &&
            candidate.rule.maximumAdditionalAttempts > 0 &&
            candidateCost !== null &&
            options.reservedCost !== null &&
            candidateCost <= options.reservedCost
          );
        });
        const persisted = await this.persistAttempts(
          options.executionId,
          route,
          error.attempts,
          globalAttempt,
          fallbackFromAttemptId
        );
        globalAttempt += error.attempts.length;
        fallbackFromAttemptId = persisted.lastAttemptId;
        this.circuitBreaker.recordFailure(
          circuitKey(options.normalized.actor.organizationId, route.providerKey)
        );
        await this.repository.recordHealth({
          accountReferenceHash: null,
          latencyMs: error.attempts.at(-1)?.latencyMs ?? 0,
          providerId: route.providerId,
          region: route.region,
          status: normalizedError.failureClass === "overloaded" ? "degraded" : "unavailable",
          success: false
        });
        if (!fallback) throw normalizedError;
        await this.repository.recordDecision(
          options.executionId,
          "routing",
          "fallback",
          [normalizedError.failureClass],
          options.context.policy?.version ?? null
        );
        route = fallback.route;
        routeMaxRetries = Math.max(
          0,
          Math.min(this.config.maxRetries, fallback.rule.maximumAdditionalAttempts - 1)
        );
        options.normalized = {
          ...options.normalized,
          model: route.modelKey,
          provider: route.providerKey
        };
      }
    }
    throw new AiExecutionError("unavailable");
  }

  private async invokeRoute(
    route: AiModelRoute,
    request: NormalizedAiRequest,
    maxRetries: number
  ): Promise<RouteExecution> {
    const key = circuitKey(request.actor.organizationId, route.providerKey);
    this.circuitBreaker.assertAvailable(key);
    const adapter = this.registry.resolve(route.providerKey);
    if (!adapter.supports(request.capability)) throw new AiExecutionError("unavailable");
    const result = await executeWithRetry({
      execute: (signal) =>
        adapter.invoke({ ...request, model: route.modelKey, provider: route.providerKey }, signal),
      maxRetries,
      timeoutMs: request.timeoutMs
    });
    return { attempts: result.attempts, response: result.value, route };
  }

  private async persistAttempts(
    executionId: string,
    route: AiModelRoute,
    attempts: RetryAttempt<NormalizedAiResponse>[],
    offset: number,
    fallbackFromAttemptId: string | null
  ) {
    let lastAttemptId: string | null = null;
    for (const [index, attempt] of attempts.entries()) {
      const providerRequestIdHash = attempt.value?.providerRequestId
        ? await sha256(attempt.value.providerRequestId)
        : null;
      const error = attempt.error;
      const status: AiAttemptEvidence["status"] =
        error?.failureClass === "timeout" ? "timed_out" : error ? "failed" : "completed";
      lastAttemptId = await this.repository.recordAttempt(executionId, {
        attemptNumber: offset + index + 1,
        completedAt: attempt.completedAt,
        failureClass: error?.failureClass ?? null,
        fallbackFromAttemptId: index === 0 ? fallbackFromAttemptId : lastAttemptId,
        latencyMs: attempt.latencyMs,
        providerRequestIdHash,
        retryable: error?.retryable ?? false,
        route,
        startedAt: attempt.startedAt,
        status
      });
      if (error)
        await this.repository.failExecution({
          attemptId: lastAttemptId,
          errorFingerprintHash: await failureFingerprint(error),
          executionId,
          failureClass: error.failureClass,
          httpStatus: error.httpStatus,
          providerCode: error.providerCode,
          retryable: error.retryable,
          terminal: false
        });
    }
    if (!lastAttemptId) throw new AiExecutionError("unavailable");
    return { lastAttemptId };
  }

  private async finalizeOutput(
    executionId: string,
    execution: RouteExecution & { successfulAttemptId: string },
    input: AiExecutionInput,
    initialRate: AiCostRate | null
  ) {
    const outputPolicy = classifyOutput(execution.response.outputText);
    if (!outputPolicy.allowed) throw new AiExecutionError("content_policy");
    const redacted = await redactSensitiveText(execution.response.outputText);
    await this.repository.recordRedactions(executionId, "output", redacted.evidence);
    let structuredOutput: unknown = null;
    if ((input.responseFormat ?? { type: "text" }).type !== "text") {
      try {
        structuredOutput = JSON.parse(redacted.text);
      } catch {
        throw new AiExecutionError("validation");
      }
      if (input.responseFormat?.type === "json_schema") {
        try {
          assertStructuredOutput(structuredOutput, input.responseFormat.schema);
        } catch {
          throw new AiExecutionError("validation");
        }
      }
    }
    const actualRate =
      initialRate?.providerId === execution.route.providerId &&
      initialRate.modelId === execution.route.modelId
        ? initialRate
        : null;
    const costMinor = estimateAiCostMinor(
      actualRate,
      execution.response.inputTokens,
      execution.response.outputTokens,
      execution.response.cacheState === "hit" ? execution.response.inputTokens : 0
    );
    const outputHash = await sha256(redacted.text);
    const structuredOutputHash =
      structuredOutput === null ? null : await sha256(JSON.stringify(structuredOutput));
    const finishReason = sanitizeProviderCode(execution.response.finishReason) ?? "completed";
    const safetyCodes = [
      ...new Set([...execution.response.safetyMetadata.codes, ...outputPolicy.codes])
    ];
    await this.repository.completeExecution({
      attemptId: execution.successfulAttemptId,
      cachedTokens: execution.response.cacheState === "hit" ? execution.response.inputTokens : 0,
      cacheState: execution.response.cacheState,
      costMinor,
      currencyCode: actualRate?.currencyCode ?? null,
      executionId,
      finishReason,
      inputTokens: execution.response.inputTokens,
      latencyMs: execution.response.latencyMs,
      outputHash,
      outputTokens: execution.response.outputTokens,
      redactionCount: redacted.evidence.reduce((sum, item) => sum + item.count, 0),
      route: execution.route,
      safetyCodes,
      structuredOutputHash
    });
    return {
      ...execution.response,
      costEstimateMinor: costMinor,
      finishReason,
      outputText: redacted.text,
      redactionMetadata: {
        categories: redacted.evidence.map((item) => item.category),
        count: redacted.evidence.reduce((sum, item) => sum + item.count, 0)
      },
      safetyMetadata: { codes: safetyCodes },
      structuredOutput
    };
  }

  private async recordTerminalFailure(executionId: string, error: AiExecutionError) {
    await this.repository.recordDecision(
      executionId,
      error.failureClass === "budget_exceeded" ? "budget" : "output",
      "block",
      [error.failureClass],
      null
    );
    await this.repository.failExecution({
      attemptId: null,
      errorFingerprintHash: await failureFingerprint(error),
      executionId,
      failureClass: error.failureClass,
      httpStatus: error.httpStatus,
      providerCode: error.providerCode,
      retryable: error.retryable,
      terminal: true
    });
  }
}

function findRate(rates: AiCostRate[], route: AiModelRoute) {
  return (
    rates.find((rate) => rate.providerId === route.providerId && rate.modelId === route.modelId) ??
    null
  );
}

function circuitKey(organizationId: string, provider: AiProviderKey) {
  return `${organizationId}:${provider}`;
}

async function failureFingerprint(error: AiExecutionError) {
  return sha256(
    JSON.stringify({
      failureClass: error.failureClass,
      httpStatus: error.httpStatus,
      provider: error.provider,
      providerCode: error.providerCode
    })
  );
}
