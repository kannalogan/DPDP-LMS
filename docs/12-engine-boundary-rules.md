# Engine Boundary Rules

## 1. Engine Shape

An engine is a logical domain boundary containing commands, queries, policies, services, events and tests. It maps to one or more `features/*` packages and may share the Next.js deployment. A new microservice requires an ADR proving independent scale, failure isolation, data ownership and operational staffing.

Every engine publishes:

- typed command and query schemas;
- server-only orchestration services;
- safe projections for UI/API consumers;
- durable event schemas;
- authorization and RLS assumptions;
- error codes, idempotency and observability contract;
- retention/classification metadata;
- unit, integration, RLS and journey tests.

## 2. Dependency Direction

```text
App Router -> feature/engine public contract -> domain service
domain service -> request-scoped Supabase client + provider-neutral service
provider adapter -> vendor SDK
database function -> atomic state transition + required evidence/outbox
event consumer -> another engine public command, never its internal tables
```

- `app/*` composes screens and request adapters; it contains no scoring, eligibility, consent, billing or authorization rules.
- Engines import another engine only through its public server/client contract. Deep imports are prohibited.
- `lib/*` remains cross-cutting and domain-neutral. Domain rules do not migrate into generic helpers.
- `services/*` owns vendor adapters, not decisions about when they run.
- Cross-engine cycles are resolved through an orchestration engine or durable event.

## 3. Data Ownership

1. One engine is the write owner for each table/aggregate.
2. Another engine reads through an exported projection/query or event-derived local projection.
3. No engine mutates another engine's table directly, even when both share PostgreSQL.
4. Foreign keys may cross engine boundaries only for stable identity/reference; they do not grant mutation authority.
5. Denormalized projections identify source/version and are rebuildable.
6. Published versions and evidence facts are immutable; corrections append superseding/compensating facts.
7. JSONB cannot hide identity, tenant, authorization, lifecycle or searchable business fields.

## 4. Command Rules

- Commands are verbs and state intent: `submitAttempt`, `withdrawConsent`, `approveReveal`.
- The command handler validates Zod schema, identity, tenant, permission, state transition and idempotency.
- Caller-supplied actor, tenant, score, audit timestamp or privileged status is ignored/rejected.
- Compliance-critical transitions execute domain mutation, audit evidence and outbox append atomically.
- Retried commands with the same idempotency key/request hash return the original result; hash mismatch returns conflict.
- High-risk commands require reason, step-up authentication and sometimes dual approval.
- Bulk commands support dry run, row-level outcome, bounded batch and replay-safe continuation.

## 5. Query Rules

- Request-scoped Supabase clients carry the user session so RLS remains active.
- Queries return purpose-built projections, not `select *` or raw cross-domain rows.
- Every tenant query starts with indexed `organization_id` or reaches it through an indexed ownership path.
- List queries use opaque cursor pagination and deterministic ordering.
- Hidden fields are excluded at SQL/projection level, not removed after fetching.
- Public queries use minimal dedicated projections/functions and exact non-enumerable identifiers.
- Private responses default to `Cache-Control: private, no-store`; identity-aware caching requires explicit review.

## 6. RLS And Privilege

- Every tenant table enables and forces RLS before production use.
- UI visibility and Server Action checks are explanatory controls; PostgreSQL policy is authoritative.
- The Supabase service-role key never appears in browser code, client-capable modules, logs or human admin tools.
- Service-role workloads are restricted to verified webhooks, scheduled workers and controlled maintenance functions.
- Platform/Super Admin is not a data bypass. PII/support access is explicit, scoped, time-bound and audited.
- Audit, consent event, PII reveal, certificate status, payment and equivalent evidence tables have no interactive update/delete policy.
- Storage bucket policies mirror parent-resource authorization; signed URLs are short-lived.

## 7. Event Rules

- Events are past-tense facts named `<domain>.<fact>.vN`.
- The canonical envelope contains event ID, type, schema version, tenant, actor reference, occurred time, correlation/causation, aggregate type/ID/version, payload and privacy classification.
- Domain mutation and outbox write share a transaction. Delivery is at least once.
- Consumers deduplicate by `(consumer,event_id)` and are safe to replay.
- Events carry identifiers and minimum facts, never secrets, raw answer keys, payment credentials or unrestricted PII.
- Event ordering is guaranteed only within an aggregate version; consumers reject or defer gaps.
- Audit evidence and analytics are consumers/companions, not replacements for domain events.

## 8. Workflow Rules

- A workflow coordinates engines; each step still calls the owning engine.
- Workflow state stores references and encrypted minimum payload, not copies of domain records.
- Every step has timeout, retry classification, idempotency key and compensation/manual-recovery rule.
- Waiting on a person/provider is a durable state, never an open request.
- Current authorization/consent is rechecked before sensitive execution, not assumed from workflow start.
- Cancellation cannot erase completed evidence; it prevents remaining steps and records outcome.

## 9. AI Rules

- Features call purpose-specific AI engines, never provider SDKs directly.
- AI input is authorized and minimized before provider invocation.
- Provider/model/prompt/source versions and normalized usage are recorded.
- AI output is schema-validated, safety-checked and labeled; consequential output requires configured human review.
- AI never writes published content, final score, certificate, consent, PII reveal, payment or hiring outcome directly.
- Assessment answer keys, unrelated tenant data and secrets are prohibited AI context.
- Raw AI content is excluded from general logs and retained by declared purpose only.
- Provider fallback is explicit and permitted only for equivalent region, privacy and capability policy.

## 10. UI Engine Contract

Every screen composes engine projections/commands and must provide:

- responsive desktop/tablet/mobile layout;
- loading skeleton without layout shift;
- meaningful empty state and next action;
- safe error with retry/recovery;
- success confirmation and persistent outcome where needed;
- optimistic update only when reversible and non-consequential;
- keyboard operation, visible focus, semantic structure and WCAG 2.2 AA contrast;
- light/dark/system themes and reduced-motion behavior;
- accessible live announcements for realtime changes;
- confirmation, reason and outcome for destructive/high-risk actions;
- AI provenance, confidence/source, edit/reject and human-review state.

No Bootstrap-style template, crowded monolithic dashboard, inline CSS prototype or page-specific duplicate business logic is accepted. Legacy wireframes are interaction evidence, not a visual implementation mandate.

## 11. Privacy And DPDP Rules

- Every P2/P3/P4 operation declares processing purpose and data recipient.
- Consent is purpose/notice/version/context bound; optional communication, AI, public credential and hiring visibility consent are separate.
- Withdrawal blocks future processing promptly but preserves minimized legal evidence.
- Rights discovery includes engine-owned tables and provider-held data.
- Retention is category/purpose/jurisdiction driven; soft deletion is not erasure.
- Minor processing remains disabled until age assurance and verifiable parental consent are approved.
- External media, email/SMS, AI and payment data flows are disclosed and governed by processor contracts/region policy.
- No candidate PII bulk export, prefetch, cache or administrative reveal override.

## 12. Audit Rules

Audit is mandatory for authentication recovery/MFA, role changes, tenant lifecycle, content publication, answer-key access, retakes/evaluation overrides, certificate issue/revoke, exports/downloads, privacy cases/retention, consent lifecycle, PII reveal, billing/payment reconciliation, API-key/webhook changes, AI high-risk review and platform support/break-glass.

Audit payloads contain safe before/after summaries or hashes, not passwords, tokens, full responses, answer keys, raw AI content or unnecessary PII.

## 13. Failure Rules

- Fail closed for identity, authorization, consent, PII reveal, answer protection, payment signature and evidence append.
- Degrade gracefully for AI, analytics, Realtime, recommendations and non-transactional notifications.
- Core learning reads continue during asynchronous worker/provider degradation where safe.
- Provider failures are normalized into stable codes and correlation IDs; no stack trace/provider secret reaches clients.
- Retry only transient failures with bounded exponential backoff and jitter; honor provider retry guidance.
- Permanent failures enter an operator-visible queue with safe replay.
- Health/readiness distinguish process liveness, critical dependencies and degraded optional engines.

## 14. Scalability Rules

- High-volume facts are append-only and partition-ready: activity, attempts, audit, analytics, AI usage, notifications and webhooks.
- Immutable content uses version-keyed caching; mutable private data avoids shared cache.
- Reporting/mentor dashboards read aggregates/projections, not unbounded transactional joins.
- External calls and large exports/imports run asynchronously with quotas/backpressure.
- Database indexes are reviewed with every FK/RLS predicate and realistic `EXPLAIN` plans.
- Scale changes implementation mechanics, not ownership or security boundaries.

## 15. Change Control

An ADR is required for a new engine, cross-engine write, new public API/event major version, service-role use, new provider/subprocessor, new PII category/purpose, retention change, high-risk AI use, public field expansion or replacement of PostgreSQL-backed workflows/events with external infrastructure.

## 16. Prohibited Patterns

- Business logic in React components, route files or database triggers without an owning engine.
- Direct provider SDK calls from pages/features.
- UI-only roles or authorization based solely on route group.
- One `admin` service/client with unrestricted tenant access.
- `select *`, arbitrary admin SQL or generic polymorphic write endpoints.
- Mutating applied migrations or published/evidence rows.
- Storing raw secrets, answer keys, payment credentials or unrestricted PII in events/logs.
- AI-generated canonical state without validation and human policy.
- Feature flags that bypass RLS, consent, security or release gates.
- Redis/cache/Realtime/provider dashboard as system of record.
