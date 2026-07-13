import "server-only";
import { cache } from "react";
import {
  canManageSearch,
  canReadSearch,
  canReadSearchAnalytics
} from "@/features/search/permissions";
import { createSearchRepository } from "@/features/search/service";
import type { SearchFilters, SearchSort } from "@/features/search/types";
import { boundedSearchOffset } from "@/features/search/validation";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const context = cache(resolveIdentityContext);
async function repository(admin = false) {
  const identity = await context();
  if (!identity?.organizationId) return null;
  const allowed = admin
    ? await canManageSearch(identity.organizationId)
    : await canReadSearch(identity.organizationId);
  return allowed
    ? createSearchRepository(
        await createSupabaseServerClient(),
        identity.organizationId,
        identity.profileId
      )
    : null;
}
export const canAccessSearch = async (admin = false) => Boolean(await repository(admin));
export async function getSearchWorkspace(admin = false) {
  return (await repository(admin))?.getWorkspace(admin) ?? null;
}
export async function runSearch(
  query: string,
  filters: SearchFilters = {},
  sort: SearchSort = "relevance",
  page = 1
) {
  const repo = await repository();
  const identity = await context();
  if (!repo || !identity?.organizationId) return null;
  const started = Date.now();
  const results = await repo.search(query, filters, sort, 24, boundedSearchOffset(page));
  const client = await createSupabaseServerClient();
  const { data } = await client.rpc("record_search", {
    p_filters: filters,
    p_latency_ms: Date.now() - started,
    p_organization_id: identity.organizationId,
    p_query: query,
    p_result_count: results.length
  });
  return { historyId: typeof data === "string" ? data : null, query, results };
}
export async function getSearchSuggestions(prefix: string) {
  return (await repository())?.autocomplete(prefix) ?? [];
}
export async function refreshSearchRecommendations() {
  const identity = await context();
  if (!identity?.organizationId || !(await canReadSearch(identity.organizationId))) return false;
  const { error } = await (
    await createSupabaseServerClient()
  ).rpc("refresh_recommendations", { p_organization_id: identity.organizationId });
  return !error;
}
export async function getSearchOrganizationId(admin = false) {
  const identity = await context();
  if (!identity?.organizationId || !(await repository(admin))) return null;
  return identity.organizationId;
}
export async function canAccessSearchAnalytics() {
  const identity = await context();
  return Boolean(
    identity?.organizationId && (await canReadSearchAnalytics(identity.organizationId))
  );
}
