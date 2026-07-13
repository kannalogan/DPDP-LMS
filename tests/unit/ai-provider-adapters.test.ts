import { describe, expect, it } from "vitest";
import { normalizeAnthropicResponse, toAnthropicRequest } from "@/features/ai/adapters/anthropic";
import { normalizeGeminiResponse, toGeminiRequest } from "@/features/ai/adapters/gemini";
import { normalizeOpenAiResponse, toOpenAiRequest } from "@/features/ai/adapters/openai";
import { normalizeProviderHttpError } from "@/features/ai/errors";
import type { NormalizedAiRequest } from "@/features/ai/execution/types";

const request: NormalizedAiRequest = {
  actor: {
    organizationId: "11111111-1111-4111-8111-111111111111",
    profileId: "22222222-2222-4222-8222-222222222222"
  },
  capability: "chat",
  dataClassification: "internal",
  idempotencyKey: "idempotency-key-1234",
  maximumOutputTokens: 200,
  messages: [{ content: "Summarize this policy.", role: "user" }],
  metadata: {},
  model: "approved-model",
  provider: "openai",
  responseFormat: { type: "text" },
  systemInstructions: "Use approved context only.",
  temperature: 0.2,
  timeoutMs: 30000,
  traceId: "33333333-3333-4333-8333-333333333333"
};

describe("AI provider adapter contracts", () => {
  it("maps OpenAI Responses requests without provider persistence", () => {
    expect(toOpenAiRequest(request)).toMatchObject({
      max_output_tokens: 200,
      model: "approved-model",
      store: false
    });
    expect(
      normalizeOpenAiResponse(
        {
          id: "response-safe-id",
          model: "approved-model",
          output: [{ content: [{ text: "Summary", type: "output_text" }] }],
          status: "completed",
          usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 }
        },
        request,
        12
      )
    ).toMatchObject({ outputText: "Summary", provider: "openai", totalTokens: 14 });
  });

  it("maps Anthropic Messages requests and usage", () => {
    const mapped = toAnthropicRequest({ ...request, provider: "anthropic" });
    expect(mapped).toMatchObject({ max_tokens: 200, model: "approved-model" });
    expect(
      normalizeAnthropicResponse(
        {
          content: [{ text: "Summary", type: "text" }],
          id: "message-safe-id",
          model: "approved-model",
          stop_reason: "end_turn",
          usage: { input_tokens: 12, output_tokens: 5 }
        },
        { ...request, provider: "anthropic" },
        15
      )
    ).toMatchObject({ outputText: "Summary", provider: "anthropic", totalTokens: 17 });
  });

  it("maps Gemini requests and normalizes safety metadata", () => {
    const mapped = toGeminiRequest({ ...request, provider: "gemini" });
    expect(mapped.contents[0]).toMatchObject({ role: "user" });
    expect(
      normalizeGeminiResponse(
        {
          candidates: [
            {
              content: { parts: [{ text: "Summary" }] },
              finishReason: "STOP",
              safetyRatings: [{ category: "HARM_CATEGORY_HARASSMENT" }]
            }
          ],
          modelVersion: "approved-model",
          responseId: "response-safe-id",
          usageMetadata: { candidatesTokenCount: 6, promptTokenCount: 9, totalTokenCount: 15 }
        },
        { ...request, provider: "gemini" },
        20
      )
    ).toMatchObject({ outputText: "Summary", provider: "gemini", totalTokens: 15 });
  });

  it("normalizes provider failures without raw provider messages", () => {
    expect(normalizeProviderHttpError("openai", 429, "rate/limit")).toMatchObject({
      failureClass: "rate_limited",
      providerCode: "rate_limit",
      retryable: true
    });
    expect(normalizeProviderHttpError("anthropic", 401, "invalid-key").message).not.toContain(
      "invalid-key"
    );
  });
});
