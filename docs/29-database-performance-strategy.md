# Database Performance Strategy

## Scale Envelope

The contract targets 1,000+ organizations, 100,000+ learners, 10,000+ courses and millions of attempts, AI interactions, audit records and events without changing ownership or tenancy. Capacity is validated with representative data distributions, including one large tenant, long-tail tenants, enterprise siblings and high-concurrency assessment windows.

## Query Design

- Every request has bounded result cardinality and deterministic ordering.
- Tenant-scoped queries begin with `organization_id` or an indexed ownership join.
- Pages read purpose-built projections; no `select *`, unbounded relationship expansion or client N+1.
- Expensive dashboard/report/search work uses aggregates/read models, not repeated transactional scans.
- Mutations return the minimum committed projection and defer independent effects through outbox/workflow.
- Query owners record expected row count, index, p95 budget and plan fixture.

## Cursor Pagination

Use keyset/search-after cursor with signed opaque payload:

```text
{ queryVersion, tenantScopeHash, sortValues[], id }
```

Common order contracts:

- feeds/events: `(occurred_at desc, id desc)`;
- admin lists: `(status, updated_at desc, id desc)`;
- learner lists: `(risk_priority, last_activity_at, profile_id)` using a safe projection;
- catalog: `(published_at desc, id desc)` or deterministic title collation + ID;
- search: `(rank_bucket desc, secondary_sort, entity_type, entity_id)`.

Offset pagination is limited to small static reference sets and never exposed for unbounded event/attempt/report collections.

## Index Portfolio

### Baseline

- PK and unique business keys from table catalog.
- FK indexes unless covered as useful composite prefix.
- Tenant/status/time composites for operational lists.
- Actor/resource/correlation indexes for audit and cases.
- Partial indexes for active/pending/due/unprocessed subsets.
- GIN text/tag indexes and trigram title/name indexes only for search-owned queries.
- BRIN time index considered for very large time-correlated partitions after benchmark.

### Covering Index Candidates

Use `INCLUDE` only after plan evidence:

| Query                | Key columns                                          | Candidate included safe fields                                                         |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Learner enrollments  | `(organization_id,profile_id,status)`                | `course_version_id,due_at,completed_at`                                                |
| Mentor due/risk list | `(organization_id,severity,resolved_at,detected_at)` | `learner_profile_id,enrollment_id,rule_key`                                            |
| Notification inbox   | `(profile_id,status,created_at desc)`                | `type,read_at,expires_at`                                                              |
| Assessment attempts  | `(profile_id,status,started_at desc)`                | `assessment_assignment_id,submitted_at,score,passed` only where release policy permits |
| Workflow claims      | `(status,available_at)`                              | `type,organization_id,attempts`                                                        |
| Outbox claims        | `(published_at,available_at)` partial unpublished    | `event_type,organization_id,attempts`                                                  |

Do not include encrypted bodies, raw PII, answer keys or large JSONB.

## Partition Strategy

| Candidate                                  | Key                                | Trigger to partition                               | Archive/retention                                     |
| ------------------------------------------ | ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `audit_events`                             | monthly `occurred_at`              | plan/maintenance degrades or >50M rows             | detach/archive by R4/legal hold                       |
| `event_outbox`                             | monthly `occurred_at`              | >20M or high delete/vacuum pressure                | retain domain-required event window; archive metadata |
| `learning_activity_events`                 | monthly `occurred_at`              | >50M                                               | R2/anonymization policy                               |
| `assessment_attempts`/integrity            | monthly start/event time           | millions/year and exam spikes                      | R2/R4                                                 |
| AI interactions/usage/provider logs        | monthly start/occurred time        | >20M or cost queries degrade                       | R7/R6                                                 |
| notification/webhook deliveries            | monthly occurred time              | >20M                                               | R6                                                    |
| analytics events                           | monthly occurred time              | from launch if expected ingestion is high          | R8                                                    |
| workflow events/background jobs            | monthly created/occurred           | queue history pressure                             | R6/domain retention                                   |
| PII reveal/consent/payment/status evidence | monthly event time after threshold | maintenance/retention need, not merely sensitivity | R4/R5                                                 |

Thresholds are starting decision points, not automatic migration commands. Partition benchmark includes pruning, insert throughput, unique constraints, FK behavior, retention drop and operational tooling. Keep a monitored default partition only as a safety net.

## Materialized Read Models

Approved candidates, not automatically created:

- mentor cohort summary by cohort/day;
- organization learning/compliance summary;
- course completion/assessment quality daily facts;
- notification unread count if direct indexed count misses SLO;
- gamification balance/badge projection from ledger;
- certificate public projection if revocation refresh SLO can be guaranteed;
- event/workflow lag/operator summary;
- billing entitlement effective projection.

Every materialized view has source tables, refresh owner/mode, freshness SLO, unique index, failure behavior and rebuild procedure. Concurrent refresh is used only when supported by a unique index and tested.

## Caching

- Immutable published content: cache by version ID/content hash with long lifetime.
- Public catalog: bounded CDN/cache tags; publication/archive invalidates.
- Certificate verification: short bounded cache by token hash/status version; revocation invalidates immediately.
- Private data: default no-store. Identity/tenant-aware caching requires key and invalidation threat review.
- Authorization, consent, PII grant, payment signature and answer-key decisions are not served from stale shared cache.
- Redis is not in the approved initial stack/source of truth. Introduce external cache/rate infrastructure only after measured PostgreSQL/provider limitation and ADR.

## Write Path And Contention

- Short transactions; no provider/network calls while holding database transaction.
- Deterministic lock order for multi-row commands.
- Attempt submission, PII reveal, consent/evidence and payment reconciliation use narrow transaction functions and idempotency.
- Atomic counters are avoided on hot parent rows; append facts and aggregate asynchronously.
- Optimistic version checks handle ordinary edit conflicts; `FOR UPDATE`/advisory locks are limited to proven critical sections.
- Bulk imports/backfills use bounded batches, checkpoints, stable order and pause controls.

## Connection Strategy

- Next.js/Vercel request traffic uses Supabase-recommended pooled connections/API clients suitable for serverless execution.
- Migrations, maintenance and operations requiring session semantics use direct/session connections under restricted credentials.
- Edge Functions prefer Supabase APIs/RLS-scoped client for user work; privileged workers use narrow secret-auth path.
- Connection budget accounts for Vercel concurrency, Edge Functions, Realtime, Cron and maintenance; alert before saturation.

## Realtime Performance

Only 12 approved tables enter Realtime. Measure subscribers x change rate because Postgres Changes performs access checks per subscriber. High-fan-out job/workflow/discussion counters move to server Broadcast/read models when authorization throughput approaches limits. Realtime is convenience, never durable event transport.

## Search Performance

- Queue indexing removes document generation from request transactions.
- GIN/trigram/vector indexes are isolated to search projections.
- Lexical filters narrow tenant/type/locale/status before expensive ranking.
- Semantic recall and tenant filtering are benchmarked with production-like corpus/skew.
- Query timeouts/minimum lengths/rate limits prevent expensive abuse.

## Archive And Retention

- Retention workflow identifies eligible partitions/rows, checks legal holds and produces execution evidence.
- Partition detach/export/drop is allowed only when all rows share approved disposition and integrity verification succeeds.
- Archived data uses encrypted, access-controlled format with manifest/hash/restore test and region policy.
- Operational tables retain compact terminal metadata while large payload/content is purged earlier under R6/R7.
- Restored backups reapply completed privacy deletion manifests before serving traffic.

## Observability And Regression

Track p50/p95/p99 latency, calls, rows, buffer/cache hit, temporary bytes, lock wait, deadlocks, connection use, replica lag, table/index size, bloat, autovacuum/analyze age, partition/default rows, queue lag and cache freshness. `pg_stat_statements` is the primary query evidence source.

Each release compares top query fingerprints and RLS plans against baseline. A migration fails review on unexpected sequential scans over large tenant/event tables, missing partition pruning, RLS recursion, lock-heavy DDL or index write cost without owner acceptance.

## Capacity Exercises

- 100k learners with realistic tenant skew and multi-membership.
- Exam start/autosave/submit burst and evaluator release.
- Millions of audit/event/AI rows with month partitions.
- 24-to-10k learner mentor cohorts and enterprise rollups.
- Bulk enrollment, report export and search reindex while interactive traffic runs.
- Payment/webhook retry storm and notification provider outage.
- Realtime fan-out/reconnect and workflow worker recovery.

Capacity result records dataset, hardware/plan, extensions, query plans, concurrency, p95/p99, errors, bottleneck, remediation and next threshold.
