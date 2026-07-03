# Search And Index Strategy

## Architecture

Search is a rebuildable projection, never authorization or source of truth.

```text
source version/event
  -> search_index_queue (dedupe, retry)
  -> authorized index worker
  -> search_documents (keyword/full text)
  -> search_embeddings (future semantic vectors)
  -> query candidate set
  -> source visibility/RLS recheck
  -> safe result projection
```

Every document records source entity/id/version, organization/global scope, locale and indexed time. A stale document may reduce freshness but can never broaden access. Deletes/archive/visibility changes enqueue removal immediately and source recheck remains mandatory.

## Query Layers

1. **Exact/structured:** stable ID, slug, verification token, status and filters with B-tree indexes.
2. **Prefix/trigram:** names/titles/slugs with normalized `citext`/`pg_trgm` indexes.
3. **Full text:** weighted `tsvector` over title/body/tags using language-appropriate configuration and `unaccent` where suitable.
4. **Semantic (future):** `search_embeddings` with approved model/version/dimensions and vector index after benchmark.
5. **Hybrid ranking:** combine lexical/semantic relevance with publication, locale, recency and explicit product weights; never use role or hidden PII as a ranking shortcut.

## Search Verticals

| Vertical                | Sources                                                             | Searchable fields                                      | Filters/indexes                                                    | Security and exclusions                                                             |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Global Search           | tracks, courses, lessons, discussions and permitted organizations   | title, summary, tags, published body excerpts          | `(organization_id,entity_type,locale)`, GIN text, trigram title    | results union only after per-source visibility; no draft/private count leakage      |
| Course Search           | `learning_tracks`, `courses`, `course_versions`, categories/tags    | track/course/category/title/outcomes/description       | B-tree track/status/locale/difficulty, GIN tags/text               | global published or tenant-private membership/entitlement                           |
| Lesson Search           | lessons/versions/resources                                          | title, approved body, resource labels/transcripts      | course/module/locale/status + GIN text                             | active entitlement; exclude answer keys, private notes and inaccessible transcripts |
| Question Search         | question banks/versions                                             | prompt, tags, difficulty/type                          | bank/status/type/difficulty, GIN tags/text                         | authors/reviewers only; keys/explanations excluded; no learner endpoint             |
| Certificate Search      | internal certificate admin only; public exact verification separate | holder safe display, certificate ID, course, status    | org/status/issued date/holder hash                                 | no anonymous listing; public uses exact high-entropy token only                     |
| Forum Search            | discussion spaces/threads/posts                                     | title/body/author safe display                         | space/status/time + GIN text/trigram                               | current space membership/moderation; removed/private content excluded               |
| Organization Search     | organizations/domains/member safe projection                        | public name/slug/domain; staff member directory fields | status/type/country, trigram name/slug                             | guests see explicitly public orgs only; member PII scoped/minimized                 |
| Candidate Search        | `candidate_search_profiles` only                                    | skills, credential summaries, experience band, region  | tenant/partner/opportunity filters, GIN skills, anti-scrape cursor | verified partner + active visibility grant; never name/email/phone before reveal    |
| Admin/Compliance Search | cases/audit/report safe projections                                 | case/resource/action/status and redacted metadata      | tenant/time/status/resource indexes                                | explicit staff permission/purpose; not in global search index                       |

## Global Search Result Contract

Result fields: `entityType`, `entityId`, `title`, `safeSnippet`, `locale`, `sourceVersion`, `routeKey`, `highlight`, `rankBucket`. It does not return internal organization/profile IDs unless the destination contract requires them, hidden counts, raw search vector, embedding, protected content or authorization explanation that leaks existence.

## Full-Text Design

- `search_documents.search_vector` is a stored generated column only if expression/language configuration is deterministic and compatible with PostgreSQL 17 constraints; otherwise the index worker writes it.
- Weights: A title/name, B tags/outcomes, C body/description, D auxiliary metadata.
- Store original content; normalized/unaccented forms are indexing aids, not display text.
- One document per entity+locale+version visibility projection. Large lessons may chunk only when semantic retrieval needs source-level citations.
- Snippets are generated from already-authorized source/index text and bounded to prevent expensive/highlight injection.

## Trigram And Prefix

- Trigram indexes serve typo-tolerant names/titles and minimum query length policy.
- Prefix autocomplete uses normalized prefix indexes or bounded trigram; never `%term%` scans on large source tables.
- Rank exact/prefix before fuzzy. Apply tenant/status filters before expensive similarity.
- Query rate limits and minimum lengths prevent enumeration and CPU abuse.

## Vector Search

- `search_embeddings` separates embeddings from keyword documents so model/version/dimension changes coexist and reindex without source mutation.
- The embedding input is an authorized, minimized source chunk with content hash. No PII, answer keys, secrets, mentor notes, assessment responses or candidate contact data enter the general vector index.
- Tenant/global filter and source type/locale are applied before result release. Approximate vector filtering can return fewer rows; iterative search/oversampling and final RLS source check are required, consistent with official [Supabase pgvector guidance](https://supabase.com/docs/guides/database/extensions/pgvector).
- HNSW versus IVFFlat is selected by measured recall, latency, memory/build cost and update rate. No vector index ships without benchmark and recall target.
- Model retirement marks embeddings stale; queue rebuilds new model version before old version expires.

## Index Queue

`search_index_queue` deduplicates `(entity_type,entity_id,source_version,operation)`. Claims are leased, retry transient failures with bounded backoff and dead-letter terminal schema/source errors. Source version is rechecked before write so stale jobs cannot overwrite newer visibility/content.

Queue operations: `upsert_keyword`, `delete_keyword`, `upsert_embedding`, `delete_embedding`, `rebuild_entity`. Embedding operations require approved model key and engine entitlement.

## Pagination And Ranking

- Opaque cursor contains rank bucket, normalized sort value, stable entity type/id and query/index version, signed to prevent tampering.
- Search-after/keyset pagination, never deep offset.
- Ranking remains deterministic within an index version. Personalization is a separately explainable Recommendation layer and cannot broaden candidate set.
- Analytics records pseudonymous query class, result count bucket, latency and selected entity; raw sensitive queries have short/no retention.

## Search SLO And Tests

Targets are set after representative benchmarks. Required tests: authorization/hidden-count leakage, stale visibility removal, locale/unaccent, typo/prefix, ranking fixtures, cursor stability, XSS/snippet, query abuse, queue replay/order, semantic recall, tenant-filter correctness and source reauthorization. Search failure never blocks direct entitled learning navigation.

## Archive And Recovery

Search documents/embeddings are rebuildable and excluded from legal system-of-record claims. Disaster recovery restores source tables first, then replays cataloged source versions/events into the queue. Index version and build watermark expose freshness throughout recovery.
