import {
  AiProviderUnavailableError,
  type AiProviderAdapter
} from "@/features/ai/providers/provider";
export class AiProviderRegistry {
  private readonly adapters = new Map<string, AiProviderAdapter>();
  register(adapter: AiProviderAdapter) {
    if (this.adapters.has(adapter.key))
      throw new Error(`Duplicate AI provider adapter: ${adapter.key}`);
    this.adapters.set(adapter.key, adapter);
  }
  resolve(providerKey: string) {
    const adapter = this.adapters.get(providerKey);
    if (!adapter) throw new AiProviderUnavailableError(providerKey);
    return adapter;
  }
  keys() {
    return [...this.adapters.keys()].sort();
  }
}
