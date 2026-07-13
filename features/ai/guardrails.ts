import type { AiGuardrailDecision } from "@/features/ai/types";
export type GuardrailContext = {
  classification: "public" | "internal" | "confidential" | "restricted";
  humanReviewRequired: boolean;
  providerConfigured: boolean;
};
export function evaluateGuardrail(context: GuardrailContext): AiGuardrailDecision {
  if (!context.providerConfigured || context.classification === "restricted") return "block";
  if (context.humanReviewRequired || context.classification === "confidential") return "review";
  return "allow";
}
