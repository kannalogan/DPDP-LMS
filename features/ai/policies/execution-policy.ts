import { AiExecutionError } from "@/features/ai/errors";
import type { AiExecutionInput, AiExecutionPolicy } from "@/features/ai/execution/types";
import { detectPromptInjection } from "@/features/ai/redaction/redactor";

const prohibitedActions = new Set([
  "approve_privacy_request",
  "change_user_role",
  "delete_evidence",
  "employment_decision",
  "finalize_grade",
  "issue_certificate",
  "legal_decision",
  "publish_policy"
]);

export function enforceExecutionPolicy(input: AiExecutionInput, policy: AiExecutionPolicy) {
  if (!policy.enabled) throw new AiExecutionError("unavailable");
  if (!policy.allowedClassifications.includes(input.dataClassification))
    throw new AiExecutionError("forbidden");
  if (input.dataClassification === "restricted" && !policy.restrictedDataAllowed)
    throw new AiExecutionError("forbidden");
  const characters =
    (input.systemInstructions?.length ?? 0) +
    input.messages.reduce((total, message) => total + message.content.length, 0);
  if (characters > policy.maxInputCharacters) throw new AiExecutionError("validation");
  if ((input.maximumOutputTokens ?? policy.maxOutputTokens) > policy.maxOutputTokens)
    throw new AiExecutionError("validation");
  const requestedAction = String(input.metadata?.action ?? "");
  if (prohibitedActions.has(requestedAction)) throw new AiExecutionError("forbidden");
  const combined = input.messages.map((message) => message.content).join("\n");
  if (detectPromptInjection(combined)) throw new AiExecutionError("content_policy");
}

export function classifyOutput(value: string) {
  if (detectPromptInjection(value)) return { allowed: false, codes: ["instruction_exfiltration"] };
  return { allowed: true, codes: [] as string[] };
}
