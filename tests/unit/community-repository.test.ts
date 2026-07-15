import { describe, expect, it, vi } from "vitest";
import { SupabaseCommunityRepository } from "@/features/community/repositories/supabase-community-repository";
function clientWith(response: { count?: number; data: unknown; error: unknown }) {
  const query: Record<string, ReturnType<typeof vi.fn> | typeof Promise.prototype.then> = {
    then: Promise.resolve(response).then.bind(Promise.resolve(response))
  };
  for (const method of ["eq", "gte", "in", "limit", "neq", "order", "select"])
    query[method] = vi.fn().mockReturnValue(query);
  return { client: { from: vi.fn(() => query) }, query };
}
const org = "11111111-1111-4111-8111-111111111111",
  profile = "22222222-2222-4222-8222-222222222222";
describe("community repository", () => {
  it("returns typed empty collections", async () => {
    const { client } = clientWith({ data: [], error: null });
    const repo = new SupabaseCommunityRepository(client as never, org, profile);
    await expect(repo.getWorkspace()).resolves.toEqual({
      conversations: [],
      liveSessions: [],
      officeHours: [],
      reports: [],
      spaces: [],
      studyGroups: [],
      topics: []
    });
  });
  it("filters spaces by active tenant", async () => {
    const { client, query } = clientWith({ data: [], error: null });
    await new SupabaseCommunityRepository(client as never, org, profile).getSpaces();
    expect(query.eq).toHaveBeenCalledWith("organization_id", org);
  });
  it("filters conversation membership by current profile", async () => {
    const { client, query } = clientWith({ data: [], error: null });
    await new SupabaseCommunityRepository(client as never, org, profile).getConversations();
    expect(query.eq).toHaveBeenCalledWith("profile_id", profile);
    expect(query.eq).toHaveBeenCalledWith("organization_id", org);
  });
  it("returns null for an unavailable topic", async () => {
    const query: Record<string, unknown> = {};
    const response = { data: null, error: null };
    for (const method of ["eq", "order", "select"]) query[method] = vi.fn().mockReturnValue(query);
    query.maybeSingle = vi.fn().mockResolvedValue(response);
    query.then = Promise.resolve(response).then.bind(Promise.resolve(response));
    const client = { from: vi.fn(() => query) };
    await expect(
      new SupabaseCommunityRepository(client as never, org, profile).getTopic(
        "33333333-3333-4333-8333-333333333333"
      )
    ).resolves.toBeNull();
  });
  it("requests moderation reports only for admin workspaces", async () => {
    const { client } = clientWith({ data: [], error: null });
    const repo = new SupabaseCommunityRepository(client as never, org, profile);
    const spy = vi.spyOn(repo, "getReports");
    await repo.getWorkspace(false);
    expect(spy).not.toHaveBeenCalled();
    await repo.getWorkspace(true);
    expect(spy).toHaveBeenCalledOnce();
  });
});
