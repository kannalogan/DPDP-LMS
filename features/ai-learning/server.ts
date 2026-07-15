import "server-only";
import { cache } from "react";
import {
  decryptAiLearningContent,
  getAiLearningEncryptionStatus
} from "@/features/ai-learning/crypto";
import { SupabaseAiLearningRepository } from "@/features/ai-learning/repositories/supabase-ai-learning-repository";
import {
  aiLearningChatSchema,
  aiLearningGenerationSchema,
  createLearningSessionSchema
} from "@/features/ai-learning/schemas";
import { AiLearningService } from "@/features/ai-learning/service";
import type { AiLearningAccess } from "@/features/ai-learning/types";
import { canManageAi, canUseAi } from "@/features/ai/permissions";
import { executeAiCapability, getAiExecutionAvailability } from "@/features/ai/execution/server";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const identityContext = cache(resolveIdentityContext);
async function context(access: AiLearningAccess) {
  const identity = await identityContext();
  if (!identity?.organizationId) return null;
  const allowed =
    access === "admin"
      ? await canManageAi(identity.organizationId)
      : await canUseAi(identity.organizationId);
  if (!allowed) return null;
  const repository = new SupabaseAiLearningRepository(
    await createSupabaseServerClient(),
    identity.organizationId,
    identity.profileId,
    decryptAiLearningContent
  );
  return { identity, repository };
}
async function studentService() {
  const resolved = await context("student");
  if (!resolved) throw new Error("AI learning permission required.");
  if (!getAiLearningEncryptionStatus().configured)
    throw new Error("AI learning encryption is unavailable.");
  return new AiLearningService(resolved.repository, executeAiCapability);
}
export async function canAccessAiLearning(access: AiLearningAccess) {
  return Boolean(await context(access));
}
export async function getAiLearningWorkspace(access: AiLearningAccess) {
  return (await context(access))?.repository.getWorkspace(access) ?? null;
}
export async function getAiLearningOrganizationId(access: AiLearningAccess) {
  return (await context(access))?.identity.organizationId ?? null;
}
export async function getAiLearningAvailability() {
  const encryption = getAiLearningEncryptionStatus();
  if (!encryption.configured)
    return { available: false, reason: "AI learning encryption is not configured." };
  try {
    const execution = await getAiExecutionAvailability();
    return {
      available: execution.available,
      reason: execution.available ? null : "No approved AI provider route is currently available."
    };
  } catch {
    return { available: false, reason: "AI execution policy is unavailable." };
  }
}
export async function startAiLearningSession(input: unknown) {
  const parsed = createLearningSessionSchema.parse(input);
  const resolved = await context("student");
  if (!resolved || resolved.identity.organizationId !== parsed.organizationId)
    throw new Error("Active organization required.");
  return (await studentService()).createSession(parsed);
}
export async function executeAiLearningChat(input: unknown) {
  return (await studentService()).chat(aiLearningChatSchema.parse(input));
}
export async function executeAiLearningGeneration(input: unknown) {
  return (await studentService()).generate(aiLearningGenerationSchema.parse(input));
}
export async function getAiLearningSession(sessionId: string) {
  const resolved = await context("student");
  if (!resolved) return null;
  const [session, messages] = await Promise.all([
    resolved.repository.getSession(sessionId),
    resolved.repository.getMessages(sessionId)
  ]);
  return session ? { messages, session } : null;
}
export async function getAiLearningFlashcards(setId: string) {
  const resolved = await context("student");
  return resolved?.repository.getFlashcards(setId) ?? [];
}
export async function getAiLearningQuizQuestions(quizId: string) {
  const resolved = await context("student");
  return resolved?.repository.getQuizQuestions(quizId) ?? [];
}
