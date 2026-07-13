# Search and Discovery Migration Notes

Migration `20260706001300_search_discovery_platform.sql` adds 22 search-owned tables, six security-invoker projections, 19 controlled RPCs, forced RLS, immutable event/index-version triggers, full-text indexes, trigram indexes, and two permission keys.

## Deployment

1. Run `npm run db:check` and verify the pinned checksum and search inventory.
2. Reset an isolated local Supabase stack with `supabase db reset`.
3. Run pgTAP, including `014_search_discovery_platform_test.sql`.
4. Regenerate database types when the configured local runtime is available.
5. Reindex modules through controlled functions; do not insert production documents manually.

The migration contains no business seed data, external search integration, vectors, embeddings, or destructive schema operations. Search documents and recommendation results are rebuildable; immutable activity evidence remains available for reporting and retention workflows.
