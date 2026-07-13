import { AiExecutionAdapterRegistry } from "@/features/ai/adapters/registry";
import { AiExecutionError } from "@/features/ai/errors";
import { AiExecutionEngine } from "@/features/ai/execution/engine";
import type {
  AiActorContext,
  AiExecutionInput,
  AiProviderKey
} from "@/features/ai/execution/types";
import type { AiExecutionRepository } from "@/features/ai/repositories/ai-execution-repository";
import type { AiServerConfig } from "@/features/ai/secrets/schema";
import { sha256 } from "@/lib/security/request";

export class AiProviderExecutionService {
  private readonly engine: AiExecutionEngine;

  constructor(
    private readonly repository: AiExecutionRepository,
    private readonly registry: AiExecutionAdapterRegistry,
    private readonly config: AiServerConfig
  ) {
    this.engine = new AiExecutionEngine(repository, registry, config);
  }

  execute(input: AiExecutionInput, actor: AiActorContext) {
    return this.engine.execute(input, actor);
  }

  async testProviderConnection(providerKey: AiProviderKey) {
    const provider = await this.repository.getProviderByKey(providerKey);
    if (!provider) throw new AiExecutionError("unavailable", { provider: providerKey });
    const adapter = this.registry.resolve(providerKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const health = await adapter.healthCheck(controller.signal);
      await this.repository.recordHealth({
        accountReferenceHash: health.accountReference
          ? await sha256(health.accountReference)
          : null,
        latencyMs: health.latencyMs,
        providerId: provider.id,
        region: health.region,
        status: health.status,
        success: health.status === "healthy"
      });
      return {
        configured: true,
        latencyMs: health.latencyMs,
        provider: providerKey,
        region: health.region,
        status: health.status
      };
    } catch (error) {
      const normalized =
        error instanceof AiExecutionError
          ? error
          : new AiExecutionError(controller.signal.aborted ? "timeout" : "unavailable", {
              provider: providerKey
            });
      await this.repository.recordHealth({
        accountReferenceHash: null,
        latencyMs: 0,
        providerId: provider.id,
        region: "unspecified",
        status: "unavailable",
        success: false
      });
      throw normalized;
    } finally {
      clearTimeout(timeout);
    }
  }
}
