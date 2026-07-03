import { getEnv } from "@/config/env";

export type RuntimeEnvironment = "development" | "testing" | "staging" | "production";

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const env = getEnv();

  if (env.NODE_ENV === "test") {
    return "testing";
  }

  if (env.VERCEL_ENV === "preview") {
    return "staging";
  }

  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isProductionRuntime() {
  return getRuntimeEnvironment() === "production";
}
