export type AiProvider = "openai" | "anthropic" | "gemini";

export interface AiGenerationRequest {
  provider?: AiProvider;
  system: string;
  prompt: string;
  organizationId: string;
}

export interface AiGenerationResult {
  provider: AiProvider;
  content: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export async function routeAiGeneration(request: AiGenerationRequest): Promise<AiGenerationResult> {
  const provider = request.provider ?? "openai";

  throw new Error(
    `AI provider '${provider}' is not configured yet. Add provider adapters under features/ai/providers.`
  );
}
