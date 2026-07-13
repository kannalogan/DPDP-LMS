import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001300_search_discovery_platform.sql"),
  "utf8"
);
const tables = [
  "search_indexes",
  "search_index_versions",
  "search_documents",
  "search_document_chunks",
  "search_categories",
  "search_tags",
  "search_tag_assignments",
  "search_synonyms",
  "search_boost_rules",
  "search_filters",
  "search_saved_queries",
  "search_history",
  "search_recent_items",
  "search_click_events",
  "search_result_events",
  "search_popularity",
  "search_recommendation_rules",
  "search_recommendation_results",
  "search_personalization_profiles",
  "search_collections",
  "search_collection_items",
  "search_dashboard_events"
];
const rpcs = [
  "index_document",
  "reindex_module",
  "remove_from_index",
  "search_content",
  "search_autocomplete",
  "record_search",
  "record_click",
  "save_search",
  "delete_saved_search",
  "pin_search",
  "unpin_search",
  "record_recent_item",
  "record_recommendation_event",
  "update_popularity",
  "refresh_recommendations",
  "record_search_dashboard_event",
  "save_search_synonym",
  "save_search_boost_rule",
  "save_recommendation_rule"
];
describe("search migration safety", () => {
  it("is one additive contract-referenced migration", () => {
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).toContain("SYRA-ADR: ADR-016");
    expect(migration).not.toMatch(/delete\s+from|drop\s+(table|schema)/i);
  });
  it("creates the canonical table and RPC inventory", () => {
    for (const table of tables)
      expect(migration).toContain(`create table if not exists public.${table}`);
    for (const rpc of rpcs) expect(migration).toContain(`function public.${rpc}`);
  });
  it("uses PostgreSQL keyword search without prohibited engines", () => {
    expect(migration).toContain("tsvector");
    expect(migration).toContain("create extension if not exists pg_trgm with schema extensions;");
    expect(migration.match(/(?:[a-z_]+\.)?gin_trgm_ops/g)).toEqual(["extensions.gin_trgm_ops"]);
    expect(migration).not.toMatch(
      /search_embeddings|elasticsearch|algolia|meilisearch|opensearch|pinecone|weaviate/i
    );
  });
  it("populates full-text vectors with deterministic row triggers", () => {
    expect(migration).not.toMatch(/search_vector\s+tsvector\s+generated\s+always/i);
    expect(migration).not.toMatch(/generated\s+always\s+as/i);
    expect(migration).toContain("function private.populate_search_document_vector()");
    expect(migration).toContain("function private.populate_search_document_chunk_vector()");
    expect(migration).toContain("before insert or update of title,keywords,summary");
    expect(migration).toContain("before insert or update of safe_excerpt");
    expect(migration).toContain("pg_catalog.array_to_string(new.keywords,' ')");
    expect(migration).toMatch(
      /setweight\([\s\S]*?'A'[\s\S]*?setweight\([\s\S]*?'B'[\s\S]*?setweight\([\s\S]*?'C'/
    );
  });
  it("forces RLS and immutable event evidence", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("reject_search_event_mutation");
    expect(migration).toContain("reject_search_index_version_mutation");
    expect(migration.match(/security_invoker=true/g)?.length).toBe(6);
  });
});
