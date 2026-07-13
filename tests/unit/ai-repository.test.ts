import { describe, expect, it, vi } from "vitest";
import { SupabaseAiRepository } from "@/features/ai/repositories/supabase-ai-repository";

function emptyClient() {
  const response = Promise.resolve({ data: [], error: null });
  const query = {
    eq: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    then: response.then.bind(response)
  };
  query.eq.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return { client: { from: vi.fn(() => query) }, query };
}

describe("AI repository", () => {
  it("returns typed empty states without provider fallbacks", async () => {
    const { client } = emptyClient();
    const repository = new SupabaseAiRepository(
      client as never,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
    await expect(repository.getWorkspace(true)).resolves.toEqual({
      auditEvents: [],
      budgets: [],
      capabilities: [],
      conversations: [],
      guardrails: [],
      models: [],
      prompts: [],
      providers: [],
      usage: [],
      workflows: []
    });
  });

  it("queries only server projections and tenant tables", async () => {
    const { client, query } = emptyClient();
    const repository = new SupabaseAiRepository(
      client as never,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
    await repository.getProviders();
    expect(client.from).toHaveBeenCalledWith("ai_provider_catalog_projection");
    expect(query.eq).toHaveBeenCalledWith(
      "organization_id",
      "11111111-1111-4111-8111-111111111111"
    );
  });
});
