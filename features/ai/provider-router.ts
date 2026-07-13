export type AiProvider = string;

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
  const provider = request.provider?.trim();

  throw new Error(
    provider
      ? `AI provider adapter is unavailable: ${provider}`
      : "No AI provider adapter is configured."
  );
}
