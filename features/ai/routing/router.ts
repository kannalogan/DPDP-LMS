import { AiExecutionError } from "@/features/ai/errors";
import type {
  AiExecutionInput,
  AiFallbackRule,
  AiModelRoute,
  AiProviderKey
} from "@/features/ai/execution/types";

export function resolveAiRoute(options: {
  availableProviders: Set<AiProviderKey>;
  defaultModel: string | null;
  defaultProvider: AiProviderKey | null;
  input: AiExecutionInput;
  routes: AiModelRoute[];
}) {
  const candidates = options.routes
    .filter((route) => route.capabilityKey === options.input.capability)
    .filter((route) => route.allowedClassifications.includes(options.input.dataClassification))
    .filter((route) => options.availableProviders.has(route.providerKey))
    .filter((route) => !route.killSwitchEnabled)
    .filter((route) => route.circuitState !== "open")
    .filter((route) => !["disabled", "unavailable"].includes(route.healthStatus ?? "unknown"))
    .filter((route) => !options.input.provider || route.providerKey === options.input.provider)
    .filter((route) => !options.input.model || route.modelKey === options.input.model)
    .sort((left, right) => {
      const leftDefault = routeDefaultScore(left, options.defaultProvider, options.defaultModel);
      const rightDefault = routeDefaultScore(right, options.defaultProvider, options.defaultModel);
      return (
        rightDefault - leftDefault ||
        left.priority - right.priority ||
        left.id.localeCompare(right.id)
      );
    });
  const selected = candidates[0];
  if (!selected) throw new AiExecutionError("unavailable");
  return selected;
}

function routeDefaultScore(
  route: AiModelRoute,
  defaultProvider: AiProviderKey | null,
  defaultModel: string | null
) {
  return (
    (route.isDefault ? 4 : 0) +
    (defaultProvider === route.providerKey ? 2 : 0) +
    (defaultModel === route.modelKey ? 1 : 0)
  );
}

export function resolveFallbackRoutes(
  primary: AiModelRoute,
  routes: AiModelRoute[],
  rules: AiFallbackRule[],
  failureClass: string
) {
  return rules
    .filter((rule) => rule.primaryRouteId === primary.id)
    .filter((rule) => rule.failureClasses.includes(failureClass))
    .sort((left, right) => left.priority - right.priority)
    .map((rule) => ({
      route: routes.find((candidate) => candidate.id === rule.fallbackRouteId),
      rule
    }))
    .filter((item): item is { route: AiModelRoute; rule: AiFallbackRule } => Boolean(item.route))
    .filter((item) => item.rule.allowRegionCrossing || item.route.region === primary.region);
}
