import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeSuggestions } from "@/features/search/autocomplete-engine";
import {
  mapAnalytics,
  mapHistory,
  mapIndexStatus,
  mapRecent,
  mapRecommendation,
  mapSavedSearch,
  mapSearchResult,
  mapSuggestion,
  mapTrending
} from "@/features/search/mappers";
import type { SearchFilters, SearchRepository, SearchSort } from "@/features/search/types";
export class SupabaseSearchRepository implements SearchRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}
  async search(query: string, filters: SearchFilters, sort: SearchSort, limit = 24, offset = 0) {
    const { data, error } = await this.client.rpc("search_content", {
      p_filters: filters,
      p_limit: limit,
      p_offset: offset,
      p_query: query,
      p_sort: sort
    });
    return error
      ? []
      : (data ?? []).map((row: unknown) => mapSearchResult(row as Record<string, unknown>));
  }
  async autocomplete(prefix: string) {
    const { data, error } = await this.client.rpc("search_autocomplete", {
      p_limit: 8,
      p_prefix: prefix
    });
    return error
      ? []
      : dedupeSuggestions(
          (data ?? []).map((row: unknown) => mapSuggestion(row as Record<string, unknown>))
        );
  }
  async getSavedSearches() {
    const { data, error } = await this.client
      .from("search_saved_query_projection")
      .select("id,name,query_text,filters,sort_key,pinned,created_at")
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapSavedSearch(row as Record<string, unknown>));
  }
  async getHistory() {
    const { data, error } = await this.client
      .from("search_history")
      .select("id,query_text,result_count,latency_ms,searched_at")
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("searched_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapHistory(row as Record<string, unknown>));
  }
  async getRecent() {
    const { data, error } = await this.client
      .from("search_recent_items")
      .select(
        "id,search_document_id,interaction_type,interaction_count,last_interacted_at,search_documents(entity_type,title,route_path)"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("last_interacted_at", { ascending: false })
      .limit(24);
    return error ? [] : (data ?? []).map((row) => mapRecent(row as Record<string, unknown>));
  }
  async getRecommendations() {
    const { data, error } = await this.client
      .from("search_recommendation_projection")
      .select(
        "id,search_document_id,recommendation_type,reason_key,score,generated_at,entity_type,title,summary,route_path"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .order("score", { ascending: false })
      .limit(24);
    return error
      ? []
      : (data ?? []).map((row) => mapRecommendation(row as Record<string, unknown>));
  }
  async getTrending() {
    const { data, error } = await this.client
      .from("search_trending_projection")
      .select(
        "search_document_id,entity_type,title,summary,route_path,view_count,click_count,popularity_score"
      )
      .or(`organization_id.eq.${this.organizationId},organization_id.is.null`)
      .order("popularity_score", { ascending: false })
      .limit(24);
    return error ? [] : (data ?? []).map((row) => mapTrending(row as Record<string, unknown>));
  }
  async getIndexes() {
    const { data, error } = await this.client
      .from("search_index_status_projection")
      .select("id,module_key,name,status,last_reindexed_at,version,source_watermark,document_count")
      .eq("organization_id", this.organizationId)
      .order("module_key");
    return error ? [] : (data ?? []).map((row) => mapIndexStatus(row as Record<string, unknown>));
  }
  async getAnalytics() {
    const { data, error } = await this.client
      .from("search_reporting_metrics")
      .select(
        "activity_day,search_volume,no_result_searches,searching_users,average_latency_ms,clicks,click_through_rate"
      )
      .eq("organization_id", this.organizationId)
      .order("activity_day", { ascending: false })
      .limit(90);
    return error ? [] : (data ?? []).map((row) => mapAnalytics(row as Record<string, unknown>));
  }
  async getWorkspace(admin = false) {
    const [saved, history, recent, recommendations, trending, indexes, analytics] =
      await Promise.all([
        this.getSavedSearches(),
        this.getHistory(),
        this.getRecent(),
        this.getRecommendations(),
        this.getTrending(),
        admin ? this.getIndexes() : Promise.resolve([]),
        admin ? this.getAnalytics() : Promise.resolve([])
      ]);
    return { analytics, history, indexes, recent, recommendations, saved, trending };
  }
}
