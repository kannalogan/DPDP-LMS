export type SearchSort = "relevance" | "recent" | "popular" | "title";
export type SearchFilters = {
  authorId?: string;
  categoryId?: string;
  courseId?: string;
  entityTypes?: string[];
  fromDate?: string;
  status?: string;
  tags?: string[];
  toDate?: string;
};
export type SearchResultDto = {
  category: string | null;
  documentId: string;
  entityId: string;
  entityType: string;
  publishedAt: string | null;
  rankScore: number;
  routePath: string;
  safeSnippet: string;
  status: string;
  tags: string[];
  title: string;
  updatedAt: string;
};
export type SearchSuggestionDto = {
  entityType: string | null;
  routePath: string | null;
  suggestion: string;
  suggestionType: "document" | "synonym";
};
export type SavedSearchDto = {
  createdAt: string;
  filters: SearchFilters;
  id: string;
  name: string;
  pinned: boolean;
  query: string;
  sort: SearchSort;
};
export type SearchHistoryDto = {
  id: string;
  latencyMs: number | null;
  query: string;
  resultCount: number;
  searchedAt: string;
};
export type RecentSearchItemDto = {
  documentId: string;
  entityType: string;
  id: string;
  interactionCount: number;
  interactionType: string;
  lastInteractedAt: string;
  routePath: string;
  title: string;
};
export type RecommendationDto = {
  documentId: string;
  entityType: string;
  generatedAt: string;
  id: string;
  reasonKey: string;
  recommendationType: string;
  routePath: string;
  score: number;
  summary: string;
  title: string;
};
export type TrendingSearchItemDto = {
  clickCount: number;
  documentId: string;
  entityType: string;
  popularityScore: number;
  routePath: string;
  summary: string;
  title: string;
  viewCount: number;
};
export type SearchIndexStatusDto = {
  documentCount: number;
  id: string;
  lastReindexedAt: string | null;
  moduleKey: string;
  name: string;
  sourceWatermark: string | null;
  status: string;
  version: number | null;
};
export type SearchAnalyticsDto = {
  activityDay: string;
  averageLatencyMs: number;
  clickThroughRate: number;
  clicks: number;
  noResultSearches: number;
  searchVolume: number;
  searchingUsers: number;
};
export type SearchWorkspaceDto = {
  analytics: SearchAnalyticsDto[];
  history: SearchHistoryDto[];
  indexes: SearchIndexStatusDto[];
  recent: RecentSearchItemDto[];
  recommendations: RecommendationDto[];
  saved: SavedSearchDto[];
  trending: TrendingSearchItemDto[];
};
export type SearchExecutionDto = {
  historyId: string | null;
  query: string;
  results: SearchResultDto[];
};
export type SearchRepository = {
  autocomplete(prefix: string): Promise<SearchSuggestionDto[]>;
  getAnalytics(): Promise<SearchAnalyticsDto[]>;
  getHistory(): Promise<SearchHistoryDto[]>;
  getIndexes(): Promise<SearchIndexStatusDto[]>;
  getRecent(): Promise<RecentSearchItemDto[]>;
  getRecommendations(): Promise<RecommendationDto[]>;
  getSavedSearches(): Promise<SavedSearchDto[]>;
  getTrending(): Promise<TrendingSearchItemDto[]>;
  getWorkspace(admin?: boolean): Promise<SearchWorkspaceDto>;
  search(
    query: string,
    filters: SearchFilters,
    sort: SearchSort,
    limit?: number,
    offset?: number
  ): Promise<SearchResultDto[]>;
};
