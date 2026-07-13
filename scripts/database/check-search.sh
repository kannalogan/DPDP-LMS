#!/usr/bin/env sh
set -eu
migration="supabase/migrations/20260706001300_search_discovery_platform.sql"
test -f "$migration"
grep -q "SYRA-ADR: ADR-016" "$migration"; grep -q "SYRA-CONTRACT:" "$migration"; grep -q "SYRA-CHANGE: additive" "$migration"
for table in search_indexes search_index_versions search_documents search_document_chunks search_categories search_tags search_tag_assignments search_synonyms search_boost_rules search_filters search_saved_queries search_history search_recent_items search_click_events search_result_events search_popularity search_recommendation_rules search_recommendation_results search_personalization_profiles search_collections search_collection_items search_dashboard_events; do grep -q "create table if not exists public.$table" "$migration"; done
for view in search_index_status_projection search_saved_query_projection search_trending_projection search_recommendation_projection search_document_access_projection search_reporting_metrics; do grep -q "view public.$view" "$migration"; done
for rpc in index_document reindex_module remove_from_index search_content search_autocomplete record_search record_click save_search delete_saved_search pin_search unpin_search record_recent_item record_recommendation_event update_popularity refresh_recommendations record_search_dashboard_event save_search_synonym save_search_boost_rule save_recommendation_rule; do grep -q "function public.$rpc" "$migration"; done
grep -q "force row level security" "$migration"; grep -q "can_read_search_document" "$migration"; grep -q "reject_search_event_mutation" "$migration"
if grep -Eiq 'delete[[:space:]]+from|drop[[:space:]]+(table|schema)' "$migration"; then echo "search check failed: destructive SQL" >&2; exit 1; fi
if grep -Eiq 'search_embeddings|(^|[^[:alnum:]_])vector[[:space:]]*\(|elasticsearch|algolia|meilisearch|opensearch|pinecone|weaviate|redis[[:space:]_-]*search' "$migration"; then echo "search check failed: prohibited search technology" >&2; exit 1; fi
echo "search migration check: ok (22 tables, 6 projections, 19 controlled RPCs, authorized search)"
