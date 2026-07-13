import { SearchRouteView } from "@/features/search/components/route-view";
import type { SearchSort } from "@/features/search/types";
export default async function SearchResultsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; type?: string }>;
}) {
  const params = await searchParams;
  const sort = ["relevance", "recent", "popular", "title"].includes(params.sort ?? "")
    ? (params.sort as SearchSort)
    : "relevance";
  return (
    <SearchRouteView
      mode="results"
      page={Math.max(1, Math.min(Number(params.page) || 1, 20))}
      query={(params.q ?? "").trim().slice(0, 200)}
      sort={sort}
      type={(params.type ?? "all").slice(0, 50)}
    />
  );
}
