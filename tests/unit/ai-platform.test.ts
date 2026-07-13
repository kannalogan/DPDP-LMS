import { describe, expect, it } from "vitest";
import { isAiCacheEntryUsable } from "@/features/ai/cache-manager";
import { canTransitionConversation } from "@/features/ai/conversation-manager";
import { evaluateGuardrail } from "@/features/ai/guardrails";
import { mapAiConversation, mapAiProvider } from "@/features/ai/mappers";
import { AiProviderUnavailableError } from "@/features/ai/providers/provider";
import { AiProviderRegistry } from "@/features/ai/providers/registry";
import { capabilitySchema, providerSchema } from "@/features/ai/schemas";
import { evaluateUsageAllowance } from "@/features/ai/token-manager";
const organizationId = "11111111-1111-4111-8111-111111111111";
describe("AI platform foundation", () => {
  it("has no default provider adapter", () => {
    const registry = new AiProviderRegistry();
    expect(registry.keys()).toEqual([]);
    expect(() => registry.resolve("unconfigured")).toThrow(AiProviderUnavailableError);
  });
  it("applies deterministic guardrail decisions", () => {
    expect(
      evaluateGuardrail({
        classification: "restricted",
        humanReviewRequired: false,
        providerConfigured: true
      })
    ).toBe("block");
    expect(
      evaluateGuardrail({
        classification: "internal",
        humanReviewRequired: true,
        providerConfigured: true
      })
    ).toBe("review");
    expect(
      evaluateGuardrail({
        classification: "public",
        humanReviewRequired: false,
        providerConfigured: true
      })
    ).toBe("allow");
  });
  it("enforces usage, cache, and conversation boundaries", () => {
    expect(evaluateUsageAllowance(100, 70, 30)).toEqual({ allowed: true, remaining: 30 });
    expect(evaluateUsageAllowance(100, 70, 31).allowed).toBe(false);
    expect(canTransitionConversation("open", "closed")).toBe(true);
    expect(canTransitionConversation("archived", "open")).toBe(false);
    expect(isAiCacheEntryUsable("valid", "2030-01-01T00:00:00.000Z", new Date("2029-01-01"))).toBe(
      true
    );
  });
  it("maps safe DTOs without raw database rows", () => {
    expect(
      mapAiProvider({ id: "p1", adapter_type: "registry", capabilities: ["chat"], model_count: 2 })
    ).toEqual({
      adapterType: "registry",
      capabilities: ["chat"],
      id: "p1",
      key: "",
      modelCount: 2,
      name: "",
      status: "",
      updatedAt: ""
    });
    expect(mapAiConversation({ id: "c1", message_count: 0 })).not.toHaveProperty(
      "title_ciphertext"
    );
  });
  it("validates provider-neutral configuration", () => {
    expect(
      providerSchema.safeParse({
        adapterType: "internal.adapter",
        capabilities: "chat",
        key: "provider",
        name: "Provider",
        organizationId
      }).success
    ).toBe(true);
    expect(
      capabilitySchema.safeParse({
        category: "learning",
        key: "summarization",
        name: "Summarization",
        organizationId,
        riskTier: "medium"
      }).success
    ).toBe(true);
  });
});
