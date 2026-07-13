import type { SearchHistoryDto } from "@/features/search/types";
export function recentUniqueQueries(items: SearchHistoryDto[], limit = 10) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.query.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
export const noResultQueries = (items: SearchHistoryDto[]) =>
  items.filter((item) => item.resultCount === 0);
