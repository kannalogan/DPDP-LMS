import type { AiMessage } from "@/features/ai/execution/types";

export type UsageAllowance = { allowed: boolean; remaining: number };
export function evaluateUsageAllowance(
  limit: number,
  used: number,
  requested: number
): UsageAllowance {
  const remaining = Math.max(0, limit - used);
  return { allowed: requested >= 0 && requested <= remaining, remaining };
}

export function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function estimateRequestTokens(systemInstructions: string, messages: AiMessage[]) {
  return (
    estimateTokens(systemInstructions) +
    messages.reduce((total, message) => total + estimateTokens(message.content) + 4, 0)
  );
}
