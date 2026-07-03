# PostgreSQL 17 Design Standards

## Types

- Use `uuid` for application PK/FK and event IDs. Default generation uses `gen_random_uuid()`; `uuid-ossp` is not required for ordinary UUID generation.
- Use `timestamptz` for instants and server `now()` defaults. Use `date` for calendar dates and integer seconds/milliseconds for durations.
- Use `citext` only for canonical case-insensitive identifiers such as slugs/domains where case preservation plus insensitive uniqueness is required.
- Use `text` plus check/registry for evolving statuses; native enum only when `docs/22-master-enum-catalog.md` marks it stable.
- Use integer minor units for money and `char(3)` ISO currency. Never use floating point for money/scores.
- Use bounded `numeric(p,s)` for percentages/scores; explicit checks define valid range.
- Use JSONB only with a versioned application/`pg_jsonschema` schema when structure is business-significant.
- Arrays are acceptable for small, bounded, non-relational value sets (tags, scopes, field categories), never for foreign-key collections.

## Required Extensions

| Extension             | Contract                                                   | Purpose and constraints                                                                                                           |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pgcrypto`            | Required                                                   | UUID generation and database cryptographic primitives; application-level envelope encryption remains preferred for selected P3/P4 |
| `pg_trgm`             | Required before fuzzy search                               | Trigram similarity and indexes for typo-tolerant title/name search                                                                |
| `unaccent`            | Required before multilingual Latin full-text normalization | Accent-insensitive text search dictionary; original text remains unchanged                                                        |
| `citext`              | Required                                                   | Case-insensitive domains/slugs/keys with clear collation review                                                                   |
| `pg_stat_statements`  | Required in managed environments                           | Query-frequency/latency evidence for index and regression work; restrict access to operators                                      |
| `vector` (`pgvector`) | Conditional, approved for semantic search                  | Embeddings in `search_embeddings`; model/version/dimension recorded; tenant filter precedes result release                        |
| `pg_cron`             | Conditional, required for Supabase Cron                    | Short scheduler triggers only; long work delegated to Edge Function/workflow workers                                              |
| `pgtap`               | Required in local/CI database testing                      | Schema, function, constraint and RLS assertions                                                                                   |
| `pg_jsonschema`       | Recommended                                                | Database validation for high-risk JSONB contracts when available/tested on target Supabase version                                |

### Explicitly Not Required

- `uuid-ossp`: supported but redundant for ordinary random UUIDs because PostgreSQL/`pgcrypto` provides the approved generator. Enable only for a documented UUID version/compatibility requirement.
- `plv8`, `pgjwt`, `timescaledb`: not part of the contract; current Supabase extension guidance marks several legacy extensions deprecated on PostgreSQL 17.
- PostGIS/ltree/pg_partman: require an ADR and measured domain need.

Extension availability/version is verified in each Supabase environment before migration. Install extensions in Supabase-recommended schemas and never create application objects in the extensions schema. See the official [Supabase extensions catalog](https://supabase.com/docs/guides/database/extensions).

## Keys And Constraints

- PK names: `<table>_pkey`; FK: `<table>_<column>_fkey`; unique: `<table>_<columns>_key`; checks: `<table>_<rule>_check`.
- Every FK names its target and `ON DELETE` behavior from `docs/24-database-relationship-map.md`.
- Prefer relational constraints over application-only validation: nonnegative quantities, ranges, valid timestamps, exactly-one-target and state invariants.
- Tenant alignment uses composite FK/unique constraints where practical, e.g. `(organization_id,parent_id)` to a parent key carrying the same organization.
- Partial unique indexes enforce one active/current record without deleting history.
- Deferrable constraints are exceptional and documented for atomic graph/version operations.
- Polymorphic references are limited to audit/event/search/favorite infrastructure and owner-engine validation.

## Generated Columns

PostgreSQL 17 supports stored generated columns, and generated columns cannot be partition keys. Use them only for deterministic immutable expressions that materially improve correctness/querying, such as a stable full-text vector or guaranteed invoice arithmetic. Do not generate values requiring tenant policy, current time, lookups or volatile functions. See [PostgreSQL 17 generated columns](https://www.postgresql.org/docs/17/ddl-generated-columns.html).

## Index Contract

- B-tree for equality/range/order; GIN for `tsvector`, arrays and approved JSONB containment; GiST only for appropriate types; BRIN for very large append-only time-correlated partitions.
- Composite order follows real predicates: tenant equality first, other equality columns, then range/order column, then stable tiebreaker `id`.
- PostgreSQL multicolumn indexes are most effective when predicates constrain leading columns; design from production query shapes, not column popularity. See [PostgreSQL 17 multicolumn indexes](https://www.postgresql.org/docs/17/indexes-multicolumn.html).
- `INCLUDE` covering columns are allowed for high-frequency narrow projections after `EXPLAIN (ANALYZE, BUFFERS)` evidence. Do not cover PII merely to avoid heap reads.
- Partial indexes cover active/pending/due subsets where selectivity and lifecycle justify them.
- Every index records owning query/RLS policy, cardinality estimate and removal criterion in migration notes.
- Avoid duplicate prefix indexes and indexes on low-cardinality booleans without a selective partial predicate.

## Partitioning

- Partition only tables marked P1/P2 after benchmark/volume threshold; premature partitions add operational cost.
- Default candidate: monthly range on `occurred_at`/`created_at`; organization subpartition only for proven skew/retention needs.
- Partition key is present in relevant uniqueness/PK strategy, and every query includes a prunable time range where possible.
- Create future partitions before the period begins; monitor default partition; archive/detach under approved retention.
- Global uniqueness across partitions is handled by keys including partition key or a non-partitioned identity/dedupe authority.

## Versions And Immutability

- Stable identity table + immutable `<entity>_versions` is the standard publication pattern.
- Version numbers are positive integers unique within owner identity; published row includes hash and timestamp.
- Mutable rows use optimistic `version` and compare-and-swap for conflicting commands.
- A2 evidence tables revoke update/delete from application roles. Corrections are compensating/superseding events.
- Applied migrations and published artifact history are never rewritten.

## Views And Materialized Views

- Views expose a deliberate projection and inherit/compose secure access; never use security-definer views casually.
- `certificate_public_views` exposes the fixed public-safe field set and exact-token lookup.
- Materialized views are reserved for expensive aggregate/search projections with explicit refresh owner, freshness SLO and unique index for concurrent refresh.
- A materialized view is not transactional authority; consumers surface freshness.

## Functions And Triggers

- Security-definer functions are narrow, search-path pinned, schema-qualified and revoke public execute.
- Use database functions for atomic high-risk transitions (attempt submit, consent append, PII reveal, audit append), not generic CRUD bypasses.
- Triggers may maintain timestamps, outbox/evidence in the same transaction and invariant checks where direct writes cannot bypass them.
- Hidden business workflows in triggers are prohibited; owning engine remains explicit and tested.

## Schema And Migration Hygiene

- One forward migration per reviewed contract change; no editing applied migration.
- Expand/migrate/contract for breaking changes: add nullable/backward-compatible structure, deploy dual readers/writers, backfill/check, enforce, then remove after deprecation window.
- Large index builds/constraints use online-safe PostgreSQL patterns and explicit timeout/lock analysis.
- Backfills are resumable, idempotent, bounded and observable; they do not run as one unbounded migration transaction.
- Migration CI creates schema from empty, upgrades a representative previous snapshot and runs pgTAP/RLS/query-plan smoke tests.

## Operations

- `pg_stat_statements`, slow query logs and Supabase metrics drive tuning; do not guess.
- Autovacuum/analyze overrides require table-specific evidence and owner.
- Connection mode matches runtime: pooled transaction mode for serverless requests where supported; direct/session connection for migrations and features needing session semantics.
- Database backups do not include Supabase Storage object bytes; database and object recovery runbooks are separate. Official Supabase database guidance documents managed backups/PITR and this Storage distinction in its [database overview](https://supabase.com/docs/guides/database/overview).
