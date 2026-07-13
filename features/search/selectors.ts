import type {
  SearchAnalyticsDto,
  SearchResultDto,
  TrendingSearchItemDto
} from "@/features/search/types";
export const resultsByType = (items: SearchResultDto[]) =>
  items.reduce<Record<string, SearchResultDto[]>>((groups, item) => {
    (groups[item.entityType] ??= []).push(item);
    return groups;
  }, {});
export const topTrending = (items: TrendingSearchItemDto[], limit = 8) =>
  [...items].sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit);
export const searchTotals = (items: SearchAnalyticsDto[]) =>
  items.reduce(
    (total, item) => ({
      clicks: total.clicks + item.clicks,
      noResults: total.noResults + item.noResultSearches,
      searches: total.searches + item.searchVolume
    }),
    { clicks: 0, noResults: 0, searches: 0 }
  );
