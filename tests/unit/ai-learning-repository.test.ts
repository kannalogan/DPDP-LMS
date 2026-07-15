import { describe, expect, it, vi } from "vitest";
import { SupabaseAiLearningRepository } from "@/features/ai-learning/repositories/supabase-ai-learning-repository";
function clientWith(response: { data: unknown; error: unknown }) {
  const query: {
    eq: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    then: typeof Promise.prototype.then;
  } = {
    eq: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(response),
    order: vi.fn(),
    select: vi.fn(),
    then: Promise.resolve(response).then.bind(Promise.resolve(response))
  };
  query.eq.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return { client: { from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue(response) }, query };
}
const org = "11111111-1111-4111-8111-111111111111",
  profile = "22222222-2222-4222-8222-222222222222";
describe("AI learning repository", () => {
  it("returns a typed empty dashboard when no evidence exists", async () => {
    const { client } = clientWith({ data: null, error: null });
    const repo = new SupabaseAiLearningRepository(
      client as never,
      org,
      profile,
      async (value) => value
    );
    await expect(repo.getDashboard()).resolves.toMatchObject({ openSessions: 0, cardsDue: 0 });
  });
  it("filters learner sessions by tenant and subject", async () => {
    const { client, query } = clientWith({ data: [], error: null });
    const repo = new SupabaseAiLearningRepository(
      client as never,
      org,
      profile,
      async (value) => value
    );
    await expect(repo.getSessions()).resolves.toEqual([]);
    expect(query.eq).toHaveBeenCalledWith("organization_id", org);
    expect(query.eq).toHaveBeenCalledWith("profile_id", profile);
  });
  it("keeps writes behind the supplied RPC boundary", async () => {
    const { client } = clientWith({ data: "id", error: null });
    const repo = new SupabaseAiLearningRepository(
      client as never,
      org,
      profile,
      async (value) => value
    );
    await repo.rpc("create_learning_session", { p_organization_id: org });
    expect(client.rpc).toHaveBeenCalledWith("create_learning_session", { p_organization_id: org });
  });
});
