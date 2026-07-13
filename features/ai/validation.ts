import { aiCapabilityKeys, type AiCapabilityKey } from "@/features/ai/types";
export const isAiCapabilityKey = (value: string): value is AiCapabilityKey =>
  aiCapabilityKeys.includes(value as AiCapabilityKey);
export function parseJsonObject(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw new Error("Expected a JSON object.");
  return parsed as Record<string, unknown>;
}
