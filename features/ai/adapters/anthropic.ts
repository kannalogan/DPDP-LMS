import { AiExecutionError } from "@/features/ai/errors";
import type {
  AiProviderAdapter,
  AiProviderHealthResult,
  NormalizedAiRequest,
  NormalizedAiResponse
} from "@/features/ai/execution/types";
import {
  array,
  defaultAiHttpTransport,
  number,
  record,
  requestProviderJson,
  safeRegion,
  string,
  type AiHttpTransport
} from "@/features/ai/adapters/transport";

export type AnthropicAdapterConfig = {
  apiKey: string;
  baseUrl: string;
  transport?: AiHttpTransport;
};

export class AnthropicAdapter implements AiProviderAdapter {
  readonly key = "anthropic" as const;
  private readonly transport: AiHttpTransport;

  constructor(private readonly config: AnthropicAdapterConfig) {
    this.transport = config.transport ?? defaultAiHttpTransport;
  }

  supports() {
    return true;
  }

  async healthCheck(signal: AbortSignal): Promise<AiProviderHealthResult> {
    const startedAt = Date.now();
    const { response } = await requestProviderJson({
      headers: this.headers(),
      method: "GET",
      provider: this.key,
      signal,
      transport: this.transport,
      url: `${this.config.baseUrl}/v1/models`
    });
    return {
      accountReference: null,
      latencyMs: Date.now() - startedAt,
      region: safeRegion(response),
      status: "healthy"
    };
  }

  async invoke(request: NormalizedAiRequest, signal: AbortSignal): Promise<NormalizedAiResponse> {
    const startedAt = Date.now();
    const { payload, response } = await requestProviderJson({
      body: toAnthropicRequest(request),
      headers: { ...this.headers(), "Content-Type": "application/json" },
      method: "POST",
      provider: this.key,
      signal,
      transport: this.transport,
      url: `${this.config.baseUrl}/v1/messages`
    });
    return normalizeAnthropicResponse(payload, request, Date.now() - startedAt, response);
  }

  private headers() {
    return { "anthropic-version": "2023-06-01", "x-api-key": this.config.apiKey };
  }
}

export function toAnthropicRequest(request: NormalizedAiRequest) {
  const outputConfig =
    request.responseFormat.type === "json_schema"
      ? {
          format: {
            schema: request.responseFormat.schema,
            type: "json_schema"
          }
        }
      : undefined;
  return {
    max_tokens: request.maximumOutputTokens,
    messages: request.messages.map((message) => ({
      content: [{ text: message.content, type: "text" }],
      role: message.role
    })),
    model: request.model,
    output_config: outputConfig,
    system: request.systemInstructions,
    temperature: request.temperature
  };
}

export function normalizeAnthropicResponse(
  value: unknown,
  request: NormalizedAiRequest,
  latencyMs: number,
  response?: Response
): NormalizedAiResponse {
  const payload = record(value);
  const usage = record(payload.usage);
  const outputText = array(payload.content)
    .map((content) => {
      const block = record(content);
      return block.type === "text" ? (string(block.text) ?? "") : "";
    })
    .join("");
  if (!outputText) throw new AiExecutionError("invalid_request", { provider: "anthropic" });
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  return {
    cacheState: number(usage.cache_read_input_tokens) > 0 ? "hit" : "miss",
    costEstimateMinor: null,
    finishReason: string(payload.stop_reason) ?? "end_turn",
    inputTokens,
    latencyMs,
    model: string(payload.model) ?? request.model,
    outputText,
    outputTokens,
    provider: "anthropic",
    providerRequestId: string(payload.id) ?? response?.headers.get("request-id") ?? null,
    redactionMetadata: { categories: [], count: 0 },
    safetyMetadata: { codes: [] },
    structuredOutput: null,
    totalTokens: inputTokens + outputTokens
  };
}
