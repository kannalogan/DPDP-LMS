import "server-only";
import { decryptEnvelope, encryptEnvelope } from "@/lib/security/envelope";
import { sha256 } from "@/lib/security/request";

export function getAiLearningEncryptionStatus() {
  const key = process.env.SYRA_AI_LEARNING_ENCRYPTION_KEY;
  return { configured: Boolean(key && Buffer.from(key, "base64").length === 32) };
}
export function requireAiLearningEncryptionKey() {
  const key = process.env.SYRA_AI_LEARNING_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32)
    throw new Error("AI learning encryption is unavailable.");
  return key;
}
export async function encryptAiLearningContent(value: string) {
  return encryptEnvelope(value, requireAiLearningEncryptionKey());
}
export async function decryptAiLearningContent(value: string) {
  return decryptEnvelope(value, requireAiLearningEncryptionKey());
}
export async function hashAiLearningContent(value: string) {
  return sha256(value);
}
