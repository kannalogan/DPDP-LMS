import type { AiCapabilityKey, AiProviderRequest, AiProviderResponse } from "@/features/ai/types";
export interface AiProviderAdapter {
  readonly key: string;
  invoke(request: AiProviderRequest): Promise<AiProviderResponse>;
  supports(capability: AiCapabilityKey): boolean;
}
export class AiProviderUnavailableError extends Error {
  constructor(providerKey: string) {
    super(`AI provider adapter is unavailable: ${providerKey}`);
    this.name = "AiProviderUnavailableError";
  }
}
