import {
  AdvancedFilterBuilder,
  Autocomplete,
  ContinueLearning,
  GlobalSearchBar,
  IndexStatus,
  RankingPreview,
  RecommendationCards,
  RecommendationRuleManager,
  SavedSearches,
  SearchAnalytics,
  SearchDashboard,
  SearchEmpty,
  SearchHistory,
  SearchPageHeader,
  SearchPermissionDenied,
  SynonymManager
} from "@/features/search/components";
import {
  canAccessSearch,
  canAccessSearchAnalytics,
  getSearchOrganizationId,
  getSearchSuggestions,
  getSearchWorkspace,
  refreshSearchRecommendations,
  runSearch
} from "@/features/search/server";
import type { SearchFilters, SearchSort } from "@/features/search/types";
export type SearchRouteMode =
  | "dashboard"
  | "results"
  | "saved"
  | "history"
  | "discover"
  | "recommendations"
  | "admin"
  | "indexes"
  | "analytics"
  | "ranking"
  | "synonyms"
  | "admin-recommendations"
  | "autocomplete";
const copy: Record<SearchRouteMode, { description: string; title: string }> = {
  dashboard: {
    title: "Search",
    description:
      "Find authorized learning, workflow, reporting, and compliance content across the platform."
  },
  results: {
    title: "Search results",
    description:
      "Ranked, filtered results from sources already available to your active organization and role."
  },
  saved: {
    title: "Saved searches",
    description: "Run, pin, and manage your private organization-scoped searches."
  },
  history: {
    title: "Search history",
    description: "Review your private query history and result outcomes."
  },
  discover: {
    title: "Discover",
    description: "Explore trending, recently viewed, and rule-based content available to you."
  },
  recommendations: {
    title: "Recommendations",
    description: "Continue work with explainable, rule-based recommendations."
  },
  admin: {
    title: "Search administration",
    description: "Monitor index health, search performance, ranking, and discovery configuration."
  },
  indexes: {
    title: "Search indexes",
    description: "Inspect immutable index versions, source watermarks, and document counts."
  },
  analytics: {
    title: "Search analytics",
    description: "Monitor volume, no-result searches, click-through rate, usage, and latency."
  },
  ranking: {
    title: "Ranking",
    description: "Configure bounded, explicit boost rules and preview deterministic ranking."
  },
  synonyms: {
    title: "Synonyms",
    description: "Manage organization search vocabulary and autocomplete expansion."
  },
  "admin-recommendations": {
    title: "Recommendation rules",
    description: "Manage explainable, non-AI recommendation priorities and conditions."
  },
  autocomplete: {
    title: "Autocomplete",
    description: "Inspect authorized prefix and synonym suggestions."
  }
};
export async function SearchRouteView({
  admin = false,
  mode,
  page = 1,
  query = "",
  sort = "relevance",
  type = "all"
}: {
  admin?: boolean;
  mode: SearchRouteMode;
  page?: number;
  query?: string;
  sort?: SearchSort;
  type?: string;
}) {
  if (!(await canAccessSearch(admin))) return <SearchPermissionDenied />;
  if (mode === "analytics" && !(await canAccessSearchAnalytics()))
    return <SearchPermissionDenied />;
  if (mode === "recommendations") await refreshSearchRecommendations();
  const [data, organizationId] = await Promise.all([
    getSearchWorkspace(admin),
    getSearchOrganizationId(admin)
  ]);
  if (!data || !organizationId) return <SearchPermissionDenied />;
  const filters: SearchFilters = type && type !== "all" ? { entityTypes: [type] } : {};
  const execution =
    mode === "results" && query.length >= 2 ? await runSearch(query, filters, sort, page) : null;
  const suggestions =
    mode === "autocomplete" && query.length >= 2 ? await getSearchSuggestions(query) : [];
  const content =
    mode === "dashboard" || mode === "discover" || mode === "admin" ? (
      <SearchDashboard data={data} />
    ) : mode === "results" ? (
      <div className="search-results-layout">
        <AdvancedFilterBuilder />
        <div>
          <GlobalSearchBar defaultValue={query} scope={type} />
          {execution ? (
            <SearchResultsBridge execution={execution} page={page} />
          ) : (
            <SearchEmpty
              description="Enter at least two characters to search."
              title="Start searching"
            />
          )}
        </div>
      </div>
    ) : mode === "saved" ? (
      <SavedSearches organizationId={organizationId} saved={data.saved} />
    ) : mode === "history" ? (
      <SearchHistory history={data.history} />
    ) : mode === "recommendations" ? (
      <div className="search-workspace">
        <ContinueLearning recommendations={data.recommendations} />
        <RecommendationCards
          recommendations={data.recommendations.filter(
            (item) => item.recommendationType !== "continue_learning"
          )}
        />
      </div>
    ) : mode === "indexes" ? (
      <IndexStatus indexes={data.indexes} organizationId={organizationId} />
    ) : mode === "analytics" ? (
      <SearchAnalytics analytics={data.analytics} />
    ) : mode === "ranking" ? (
      <RankingPreview organizationId={organizationId} />
    ) : mode === "synonyms" ? (
      <SynonymManager organizationId={organizationId} />
    ) : mode === "admin-recommendations" ? (
      <RecommendationRuleManager organizationId={organizationId} />
    ) : mode === "autocomplete" ? (
      <Autocomplete suggestions={suggestions} />
    ) : (
      <SearchEmpty />
    );
  return (
    <>
      <SearchPageHeader {...copy[mode]} />
      <div className="search-workspace">{content}</div>
    </>
  );
}
async function SearchResultsBridge({
  execution,
  page
}: {
  execution: NonNullable<Awaited<ReturnType<typeof runSearch>>>;
  page: number;
}) {
  const { SearchResults } = await import("@/features/search/components");
  return <SearchResults execution={execution} page={page} />;
}
