import { AnthropicAdapter } from "@/features/ai/adapters/anthropic";
import { GeminiAdapter } from "@/features/ai/adapters/gemini";
import { OpenAiAdapter } from "@/features/ai/adapters/openai";
import { AiExecutionError } from "@/features/ai/errors";
import type { AiProviderAdapter, AiProviderKey } from "@/features/ai/execution/types";
import type { AiServerConfig } from "@/features/ai/secrets/schema";

export class AiExecutionAdapterRegistry {
  private readonly adapters = new Map<AiProviderKey, AiProviderAdapter>();

  register(adapter: AiProviderAdapter) {
    if (this.adapters.has(adapter.key)) throw new Error("Duplicate AI provider adapter.");
    this.adapters.set(adapter.key, adapter);
  }

  resolve(provider: AiProviderKey) {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new AiExecutionError("unavailable", { provider });
    return adapter;
  }

  status() {
    return (["openai", "anthropic", "gemini"] as const).map((provider) => ({
      available: this.adapters.has(provider),
      provider
    }));
  }
}

export function createAiExecutionAdapterRegistry(config: AiServerConfig) {
  const registry = new AiExecutionAdapterRegistry();
  const openai = config.providers.openai;
  if (openai.enabled && openai.apiKey)
    registry.register(new OpenAiAdapter({ apiKey: openai.apiKey, baseUrl: openai.baseUrl }));
  const anthropic = config.providers.anthropic;
  if (anthropic.enabled && anthropic.apiKey)
    registry.register(
      new AnthropicAdapter({ apiKey: anthropic.apiKey, baseUrl: anthropic.baseUrl })
    );
  const gemini = config.providers.gemini;
  if (gemini.enabled && gemini.apiKey)
    registry.register(new GeminiAdapter({ apiKey: gemini.apiKey, baseUrl: gemini.baseUrl }));
  return registry;
}
