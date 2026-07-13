import { z } from "zod";
import { aiProviderKeys, type AiProviderKey } from "@/features/ai/execution/types";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().min(1).optional().or(z.literal(""));
const booleanValue = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const aiServerEnvSchema = z.object({
  AI_DEFAULT_MODEL: z.string().trim().min(1).max(200).optional().or(z.literal("")),
  AI_DEFAULT_PROVIDER: z.enum(aiProviderKeys).optional().or(z.literal("")),
  AI_GLOBAL_KILL_SWITCH: booleanValue,
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_PROVIDER_ANTHROPIC_ENABLED: booleanValue,
  AI_PROVIDER_GEMINI_ENABLED: booleanValue,
  AI_PROVIDER_OPENAI_ENABLED: booleanValue,
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600000).default(30000),
  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_BASE_URL: optionalUrl,
  GEMINI_API_KEY: optionalSecret,
  GEMINI_BASE_URL: optionalUrl,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: optionalSecret,
  OPENAI_BASE_URL: optionalUrl
});

export type AiProviderSecretConfig = {
  apiKey: string | null;
  baseUrl: string;
  enabled: boolean;
};

export type AiServerConfig = {
  defaultModel: string | null;
  defaultProvider: AiProviderKey | null;
  globalKillSwitch: boolean;
  maxRetries: number;
  providers: Record<AiProviderKey, AiProviderSecretConfig>;
  requestTimeoutMs: number;
};

const defaults: Record<AiProviderKey, string> = {
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
  openai: "https://api.openai.com"
};

function validateBaseUrl(value: string, nodeEnv: "development" | "production" | "test") {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error(
      "AI provider base URLs cannot include credentials, query strings, or fragments."
    );
  if (nodeEnv === "production" && parsed.protocol !== "https:")
    throw new Error("AI provider base URLs must use HTTPS in production.");
  if (
    nodeEnv === "production" &&
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1")
  )
    throw new Error("AI provider base URLs cannot target loopback hosts in production.");
  return value.replace(/\/$/, "");
}

export function parseAiServerConfig(environment: NodeJS.ProcessEnv): AiServerConfig {
  const parsed = aiServerEnvSchema.safeParse(environment);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ");
    throw new Error(`Invalid server-only AI environment variables: ${names}`);
  }
  const env = parsed.data;
  const providers: Record<AiProviderKey, AiProviderSecretConfig> = {
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY || null,
      baseUrl: validateBaseUrl(env.ANTHROPIC_BASE_URL || defaults.anthropic, env.NODE_ENV),
      enabled: env.AI_PROVIDER_ANTHROPIC_ENABLED
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY || null,
      baseUrl: validateBaseUrl(env.GEMINI_BASE_URL || defaults.gemini, env.NODE_ENV),
      enabled: env.AI_PROVIDER_GEMINI_ENABLED
    },
    openai: {
      apiKey: env.OPENAI_API_KEY || null,
      baseUrl: validateBaseUrl(env.OPENAI_BASE_URL || defaults.openai, env.NODE_ENV),
      enabled: env.AI_PROVIDER_OPENAI_ENABLED
    }
  };
  const defaultProvider = env.AI_DEFAULT_PROVIDER || null;
  if (env.NODE_ENV === "production" && defaultProvider) {
    const configured = providers[defaultProvider];
    if (!configured.enabled || !configured.apiKey)
      throw new Error(
        "The configured default AI provider is not enabled with valid server credentials."
      );
  }
  return {
    defaultModel: env.AI_DEFAULT_MODEL || null,
    defaultProvider,
    globalKillSwitch: env.AI_GLOBAL_KILL_SWITCH,
    maxRetries: env.AI_MAX_RETRIES,
    providers,
    requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS
  };
}

export function getProviderConfigurationStatus(config: AiServerConfig) {
  return aiProviderKeys.map((provider) => ({
    configured: Boolean(config.providers[provider].apiKey),
    enabled: config.providers[provider].enabled,
    provider
  }));
}
