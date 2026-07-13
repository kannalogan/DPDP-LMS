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

export type OpenAiAdapterConfig = {
  apiKey: string;
  baseUrl: string;
  transport?: AiHttpTransport;
};

export class OpenAiAdapter implements AiProviderAdapter {
  readonly key = "openai" as const;
  private readonly transport: AiHttpTransport;

  constructor(private readonly config: OpenAiAdapterConfig) {
    this.transport = config.transport ?? defaultAiHttpTransport;
  }

  supports() {
    return true;
  }

  async healthCheck(signal: AbortSignal): Promise<AiProviderHealthResult> {
    const startedAt = Date.now();
    const { response } = await requestProviderJson({
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
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
      body: toOpenAiRequest(request),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": request.traceId
      },
      method: "POST",
      provider: this.key,
      signal,
      transport: this.transport,
      url: `${this.config.baseUrl}/v1/responses`
    });
    return normalizeOpenAiResponse(payload, request, Date.now() - startedAt, response);
  }
}

export function toOpenAiRequest(request: NormalizedAiRequest) {
  const format =
    request.responseFormat.type === "json_schema"
      ? {
          name: request.responseFormat.name,
          schema: request.responseFormat.schema,
          strict: true,
          type: "json_schema"
        }
      : { type: request.responseFormat.type };
  return {
    input: request.messages.map((message) => ({
      content: [{ text: message.content, type: "input_text" }],
      role: message.role
    })),
    instructions: request.systemInstructions,
    max_output_tokens: request.maximumOutputTokens,
    model: request.model,
    store: false,
    temperature: request.temperature,
    text: { format }
  };
}

export function normalizeOpenAiResponse(
  value: unknown,
  request: NormalizedAiRequest,
  latencyMs: number,
  response?: Response
): NormalizedAiResponse {
  const payload = record(value);
  const usage = record(payload.usage);
  const outputText = array(payload.output)
    .flatMap((item) => array(record(item).content))
    .map((content) => {
      const block = record(content);
      if (block.type === "refusal")
        throw new AiExecutionError("content_policy", { provider: "openai" });
      return block.type === "output_text" ? (string(block.text) ?? "") : "";
    })
    .join("");
  if (!outputText) throw new AiExecutionError("invalid_request", { provider: "openai" });
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  return {
    cacheState: "miss",
    costEstimateMinor: null,
    finishReason: string(payload.status) ?? "completed",
    inputTokens,
    latencyMs,
    model: string(payload.model) ?? request.model,
    outputText,
    outputTokens,
    provider: "openai",
    providerRequestId: string(payload.id) ?? response?.headers.get("x-request-id") ?? null,
    redactionMetadata: { categories: [], count: 0 },
    safetyMetadata: { codes: [] },
    structuredOutput: null,
    totalTokens: number(usage.total_tokens) || inputTokens + outputTokens
  };
}
