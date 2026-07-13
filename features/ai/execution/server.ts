import "server-only";
import { createAiExecutionAdapterRegistry } from "@/features/ai/adapters/registry";
import { canManageAi, canUseAi } from "@/features/ai/permissions";
import { AiExecutionError } from "@/features/ai/errors";
import { aiExecutionInputSchema } from "@/features/ai/execution/schema";
import { AiProviderExecutionService } from "@/features/ai/execution/service";
import type { AiExecutionInput, AiProviderKey } from "@/features/ai/execution/types";
import { AiExecutionRepository } from "@/features/ai/repositories/ai-execution-repository";
import { resolveAiRoute } from "@/features/ai/routing/router";
import { getAiServerConfig } from "@/features/ai/secrets/server-env";
import { getProviderConfigurationStatus } from "@/features/ai/secrets/schema";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function executionContext(permission: "manage" | "use") {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) throw new AiExecutionError("permission");
  const allowed =
    permission === "manage"
      ? await canManageAi(identity.organizationId)
      : await canUseAi(identity.organizationId);
  if (!allowed) throw new AiExecutionError("permission");
  const config = getAiServerConfig();
  const repository = new AiExecutionRepository(
    await createSupabaseServerClient(),
    identity.organizationId,
    identity.profileId
  );
  return {
    config,
    identity: { organizationId: identity.organizationId, profileId: identity.profileId },
    repository,
    service: new AiProviderExecutionService(
      repository,
      createAiExecutionAdapterRegistry(config),
      config
    )
  };
}

export async function executeAiCapability(input: unknown) {
  const parsed = aiExecutionInputSchema.safeParse(input);
  if (!parsed.success) throw new AiExecutionError("validation");
  const context = await executionContext("use");
  return context.service.execute(parsed.data as AiExecutionInput, context.identity);
}

export async function testAiProviderConnection(provider: AiProviderKey) {
  const context = await executionContext("manage");
  return context.service.testProviderConnection(provider);
}

export async function getAiExecutionAdminOverview() {
  const context = await executionContext("manage");
  return context.repository.getAdminOverview(getProviderConfigurationStatus(context.config));
}

export async function getAiProviderConfigurationStatus() {
  const context = await executionContext("manage");
  return getProviderConfigurationStatus(context.config);
}

export async function getAiExecutionAvailability() {
  const context = await executionContext("use");
  const [policy, routes] = await Promise.all([
    context.repository.getPolicy(),
    context.repository.getRoutes()
  ]);
  const configuredProviders = getProviderConfigurationStatus(context.config).filter(
    (item) => item.configured && item.enabled
  );
  const providerAllowed = configuredProviders.some((item) =>
    routes.some(
      (route) =>
        route.providerKey === item.provider &&
        !route.killSwitchEnabled &&
        route.circuitState !== "open" &&
        !["disabled", "unavailable"].includes(route.healthStatus ?? "unknown") &&
        (policy?.allowedProviderKeys.length === 0 ||
          policy?.allowedProviderKeys.includes(item.provider))
    )
  );
  return {
    available: Boolean(!context.config.globalKillSwitch && policy?.enabled && providerAllowed)
  };
}

export async function resolveAiModelRoute(input: {
  capability: AiExecutionInput["capability"];
  dataClassification: AiExecutionInput["dataClassification"];
  model?: string;
  provider?: AiProviderKey;
}) {
  const context = await executionContext("manage");
  const execution = await context.repository.getContext(input.capability);
  const availableProviders = new Set(
    getProviderConfigurationStatus(context.config)
      .filter((item) => item.configured && item.enabled)
      .map((item) => item.provider)
  );
  const route = resolveAiRoute({
    availableProviders,
    defaultModel: context.config.defaultModel,
    defaultProvider: context.config.defaultProvider,
    input: {
      capability: input.capability,
      dataClassification: input.dataClassification,
      idempotencyKey: "route-resolution-only",
      messages: [{ content: "route resolution", role: "user" }],
      ...(input.model ? { model: input.model } : {}),
      ...(input.provider ? { provider: input.provider } : {})
    },
    routes: execution.routes
  });
  return {
    capability: route.capabilityKey,
    model: route.modelKey,
    provider: route.providerKey,
    region: route.region,
    routeId: route.id
  };
}
