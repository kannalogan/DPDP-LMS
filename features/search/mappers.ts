import type {
  RecentSearchItemDto,
  RecommendationDto,
  SavedSearchDto,
  SearchAnalyticsDto,
  SearchHistoryDto,
  SearchIndexStatusDto,
  SearchResultDto,
  SearchSuggestionDto,
  TrendingSearchItemDto
} from "@/features/search/types";
type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const object = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const mapSearchResult = (row: Row): SearchResultDto => ({
  category: nullableText(row.category),
  documentId: text(row.document_id),
  entityId: text(row.entity_id),
  entityType: text(row.entity_type),
  publishedAt: nullableText(row.published_at),
  rankScore: number(row.rank_score),
  routePath: text(row.route_path),
  safeSnippet: text(row.safe_snippet),
  status: text(row.status),
  tags: Array.isArray(row.tags)
    ? row.tags.filter((item): item is string => typeof item === "string")
    : [],
  title: text(row.title),
  updatedAt: text(row.updated_at)
});
export const mapSuggestion = (row: Row): SearchSuggestionDto => ({
  entityType: nullableText(row.entity_type),
  routePath: nullableText(row.route_path),
  suggestion: text(row.suggestion),
  suggestionType: text(row.suggestion_type, "document") as SearchSuggestionDto["suggestionType"]
});
export const mapSavedSearch = (row: Row): SavedSearchDto => ({
  createdAt: text(row.created_at),
  filters: object(row.filters),
  id: text(row.id),
  name: text(row.name),
  pinned: row.pinned === true,
  query: text(row.query_text),
  sort: text(row.sort_key, "relevance") as SavedSearchDto["sort"]
});
export const mapHistory = (row: Row): SearchHistoryDto => ({
  id: text(row.id),
  latencyMs: row.latency_ms == null ? null : number(row.latency_ms),
  query: text(row.query_text),
  resultCount: number(row.result_count),
  searchedAt: text(row.searched_at)
});
export const mapRecent = (row: Row): RecentSearchItemDto => ({
  documentId: text(row.search_document_id),
  entityType: text(row.search_documents && object(row.search_documents).entity_type),
  id: text(row.id),
  interactionCount: number(row.interaction_count),
  interactionType: text(row.interaction_type),
  lastInteractedAt: text(row.last_interacted_at),
  routePath: text(row.search_documents && object(row.search_documents).route_path),
  title: text(row.search_documents && object(row.search_documents).title)
});
export const mapRecommendation = (row: Row): RecommendationDto => ({
  documentId: text(row.search_document_id),
  entityType: text(row.entity_type),
  generatedAt: text(row.generated_at),
  id: text(row.id),
  reasonKey: text(row.reason_key),
  recommendationType: text(row.recommendation_type),
  routePath: text(row.route_path),
  score: number(row.score),
  summary: text(row.summary),
  title: text(row.title)
});
export const mapTrending = (row: Row): TrendingSearchItemDto => ({
  clickCount: number(row.click_count),
  documentId: text(row.search_document_id),
  entityType: text(row.entity_type),
  popularityScore: number(row.popularity_score),
  routePath: text(row.route_path),
  summary: text(row.summary),
  title: text(row.title),
  viewCount: number(row.view_count)
});
export const mapIndexStatus = (row: Row): SearchIndexStatusDto => ({
  documentCount: number(row.document_count),
  id: text(row.id),
  lastReindexedAt: nullableText(row.last_reindexed_at),
  moduleKey: text(row.module_key),
  name: text(row.name),
  sourceWatermark: nullableText(row.source_watermark),
  status: text(row.status),
  version: row.version == null ? null : number(row.version)
});
export const mapAnalytics = (row: Row): SearchAnalyticsDto => ({
  activityDay: text(row.activity_day),
  averageLatencyMs: number(row.average_latency_ms),
  clickThroughRate: number(row.click_through_rate),
  clicks: number(row.clicks),
  noResultSearches: number(row.no_result_searches),
  searchVolume: number(row.search_volume),
  searchingUsers: number(row.searching_users)
});
