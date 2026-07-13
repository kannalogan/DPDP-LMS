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

export type GeminiAdapterConfig = {
  apiKey: string;
  baseUrl: string;
  transport?: AiHttpTransport;
};

export class GeminiAdapter implements AiProviderAdapter {
  readonly key = "gemini" as const;
  private readonly transport: AiHttpTransport;

  constructor(private readonly config: GeminiAdapterConfig) {
    this.transport = config.transport ?? defaultAiHttpTransport;
  }

  supports() {
    return true;
  }

  async healthCheck(signal: AbortSignal): Promise<AiProviderHealthResult> {
    const startedAt = Date.now();
    const { response } = await requestProviderJson({
      headers: { "x-goog-api-key": this.config.apiKey },
      method: "GET",
      provider: this.key,
      signal,
      transport: this.transport,
      url: `${this.config.baseUrl}/v1beta/models`
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
      body: toGeminiRequest(request),
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.config.apiKey },
      method: "POST",
      provider: this.key,
      signal,
      transport: this.transport,
      url: `${this.config.baseUrl}/v1beta/models/${encodeURIComponent(request.model)}:generateContent`
    });
    return normalizeGeminiResponse(payload, request, Date.now() - startedAt, response);
  }
}

export function toGeminiRequest(request: NormalizedAiRequest) {
  const responseSchema =
    request.responseFormat.type === "json_schema" ? request.responseFormat.schema : undefined;
  return {
    contents: request.messages.map((message) => ({
      parts: [{ text: message.content }],
      role: message.role === "assistant" ? "model" : "user"
    })),
    generationConfig: {
      maxOutputTokens: request.maximumOutputTokens,
      responseMimeType: request.responseFormat.type === "text" ? "text/plain" : "application/json",
      responseSchema,
      temperature: request.temperature
    },
    systemInstruction: { parts: [{ text: request.systemInstructions }] }
  };
}

export function normalizeGeminiResponse(
  value: unknown,
  request: NormalizedAiRequest,
  latencyMs: number,
  response?: Response
): NormalizedAiResponse {
  const payload = record(value);
  const feedback = record(payload.promptFeedback);
  if (feedback.blockReason)
    throw new AiExecutionError("content_policy", {
      provider: "gemini",
      providerCode: string(feedback.blockReason)
    });
  const candidate = record(array(payload.candidates)[0]);
  const content = record(candidate.content);
  const outputText = array(content.parts)
    .map((part) => string(record(part).text) ?? "")
    .join("");
  if (!outputText) throw new AiExecutionError("invalid_request", { provider: "gemini" });
  const usage = record(payload.usageMetadata);
  const inputTokens = number(usage.promptTokenCount);
  const outputTokens = number(usage.candidatesTokenCount);
  const safetyCodes = array(candidate.safetyRatings)
    .map((rating) => string(record(rating).category))
    .filter((value): value is string => Boolean(value));
  return {
    cacheState: number(usage.cachedContentTokenCount) > 0 ? "hit" : "miss",
    costEstimateMinor: null,
    finishReason: string(candidate.finishReason) ?? "STOP",
    inputTokens,
    latencyMs,
    model: string(payload.modelVersion) ?? request.model,
    outputText,
    outputTokens,
    provider: "gemini",
    providerRequestId: string(payload.responseId) ?? response?.headers.get("x-request-id") ?? null,
    redactionMetadata: { categories: [], count: 0 },
    safetyMetadata: { codes: safetyCodes },
    structuredOutput: null,
    totalTokens: number(usage.totalTokenCount) || inputTokens + outputTokens
  };
}
