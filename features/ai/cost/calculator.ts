import type { AiCostRate } from "@/features/ai/execution/types";

export function estimateAiCostMinor(
  rate: AiCostRate | null,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0
) {
  if (!rate || rate.inputCostPerMillion === null || rate.outputCostPerMillion === null) return null;
  const uncachedInput = Math.max(inputTokens - cachedTokens, 0);
  const inputCost = (uncachedInput * rate.inputCostPerMillion) / 1_000_000;
  const cachedRate = rate.cachedInputCostPerMillion ?? rate.inputCostPerMillion;
  const cachedCost = (cachedTokens * cachedRate) / 1_000_000;
  const outputCost = (outputTokens * rate.outputCostPerMillion) / 1_000_000;
  return Math.ceil(inputCost + cachedCost + outputCost);
}
