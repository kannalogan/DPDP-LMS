import { describe, expect, it, vi } from "vitest";
import { dedupeSuggestions, filterSuggestions } from "@/features/search/autocomplete-engine";
import { recentUniqueQueries } from "@/features/search/history-manager";
import {
  mapRecommendation,
  mapSavedSearch,
  mapSearchResult,
  mapSuggestion
} from "@/features/search/mappers";
import { calculateSearchRank, stableSearchSort } from "@/features/search/ranking-engine";
import {
  recommendationLabel,
  recommendationsByType
} from "@/features/search/recommendation-engine";
import { pinnedSearches } from "@/features/search/saved-search-manager";
import { saveSearchSchema, searchQuerySchema } from "@/features/search/schemas";
describe("search and discovery platform", () => {
  it("maps safe result DTOs without audience internals", () => {
    const result = mapSearchResult({
      document_id: "d1",
      entity_id: "e1",
      entity_type: "course",
      title: "DPDP Essentials",
      safe_snippet: "Learn the essentials",
      route_path: "/student/courses/dpdp",
      rank_score: "12.5",
      tags: ["privacy"]
    });
    expect(result).toMatchObject({ documentId: "d1", entityType: "course", rankScore: 12.5 });
    expect(result).not.toHaveProperty("required_permission");
  });
  it("deduplicates and filters authorized autocomplete suggestions", () => {
    const items = [
      mapSuggestion({ suggestion: "DPDP Essentials", suggestion_type: "document" }),
      mapSuggestion({ suggestion: "dpdp essentials", suggestion_type: "synonym" }),
      mapSuggestion({ suggestion: "Privacy Operations", suggestion_type: "document" })
    ];
    expect(dedupeSuggestions(items)).toHaveLength(2);
    expect(filterSuggestions(items, "pri")[0]?.suggestion).toBe("Privacy Operations");
  });
  it("ranks lexical and exact title matches deterministically", () => {
    vi.setSystemTime(new Date("2026-07-13T00:00:00Z"));
    const exact = calculateSearchRank({
      exactTitle: true,
      lexical: 1,
      popularity: 5,
      updatedAt: "2026-07-12T00:00:00Z"
    });
    const broad = calculateSearchRank({
      lexical: 1,
      popularity: 5,
      updatedAt: "2026-07-12T00:00:00Z"
    });
    expect(exact).toBeGreaterThan(broad);
    expect(
      stableSearchSort([
        { entityId: "b", entityType: "course", rankScore: 4 },
        { entityId: "a", entityType: "course", rankScore: 4 }
      ])[0]?.entityId
    ).toBe("a");
    vi.useRealTimers();
  });
  it("groups explainable rule-based recommendations", () => {
    const recommendation = mapRecommendation({
      id: "r1",
      search_document_id: "d1",
      recommendation_type: "continue_learning",
      reason_key: "recent_activity",
      score: 9,
      title: "Resume lesson"
    });
    expect(recommendationLabel(recommendation.recommendationType)).toBe("Continue learning");
    expect(recommendationsByType([recommendation]).continue_learning).toHaveLength(1);
  });
  it("orders private saved searches and deduplicates private history", () => {
    const saved = [
      mapSavedSearch({ id: "s1", name: "One", pinned: false, created_at: "2026-07-12" }),
      mapSavedSearch({ id: "s2", name: "Two", pinned: true, created_at: "2026-07-11" })
    ];
    expect(pinnedSearches(saved)).toEqual([saved[1]]);
    expect(
      recentUniqueQueries([
        { id: "h1", query: "privacy", resultCount: 1, latencyMs: 2, searchedAt: "2" },
        { id: "h2", query: "Privacy", resultCount: 2, latencyMs: 3, searchedAt: "1" }
      ])
    ).toHaveLength(1);
  });
  it("validates query and saved-search DTO inputs", () => {
    expect(searchQuerySchema.safeParse({ q: "privacy", sort: "popular", page: "2" }).success).toBe(
      true
    );
    expect(
      saveSearchSchema.safeParse({
        organizationId: "11111111-1111-4111-8111-111111111111",
        name: "Privacy",
        query: "privacy",
        filters: "{}",
        sort: "relevance"
      }).success
    ).toBe(true);
    expect(searchQuerySchema.safeParse({ q: "x" }).success).toBe(false);
  });
});
