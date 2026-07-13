import type { SavedSearchDto } from "@/features/search/types";
export const pinnedSearches = (items: SavedSearchDto[]) => items.filter((item) => item.pinned);
export const orderedSavedSearches = (items: SavedSearchDto[]) =>
  [...items].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)
  );
