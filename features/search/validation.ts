export const isSafeSearchRoute = (value: string) =>
  value.startsWith("/") && !value.startsWith("//") && !value.includes("://");
export const isSearchableQuery = (value: string) =>
  value.trim().length >= 2 && value.trim().length <= 200;
export const boundedSearchOffset = (page: number, pageSize = 24) =>
  Math.min(Math.max(page - 1, 0) * pageSize, 500);
