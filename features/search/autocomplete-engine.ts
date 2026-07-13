import type { SearchSuggestionDto } from "@/features/search/types";
export function dedupeSuggestions(items: SearchSuggestionDto[], limit = 8) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.suggestion.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
export function filterSuggestions(items: SearchSuggestionDto[], prefix: string) {
  const normalized = prefix.trim().toLowerCase();
  return dedupeSuggestions(
    items.filter((item) => item.suggestion.toLowerCase().startsWith(normalized))
  );
}
