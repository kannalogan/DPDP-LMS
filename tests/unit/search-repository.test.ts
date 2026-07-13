import { describe, expect, it, vi } from "vitest";
import { SupabaseSearchRepository } from "@/features/search/repositories/supabase-search-repository";
describe("search repository", () => {
  it("maps RPC results and passes bounded search parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          document_id: "d1",
          entity_id: "e1",
          entity_type: "course",
          title: "Course",
          route_path: "/course",
          rank_score: 5
        }
      ],
      error: null
    });
    const repository = new SupabaseSearchRepository(
      { rpc } as never,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
    const results = await repository.search("course", {}, "relevance", 24, 0);
    expect(results[0]?.documentId).toBe("d1");
    expect(rpc).toHaveBeenCalledWith(
      "search_content",
      expect.objectContaining({ p_limit: 24, p_offset: 0, p_query: "course" })
    );
  });
  it("returns safe empty state when RPC search fails", async () => {
    const repository = new SupabaseSearchRepository(
      { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }) } as never,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
    await expect(repository.search("course", {}, "relevance")).resolves.toEqual([]);
  });
});
