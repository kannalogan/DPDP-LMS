# Master Database Contract

## Authority

This document set is the permanent logical database contract for SYRA. It supersedes the design authority of `docs/03-database-blueprint.md` while preserving its approved entities and engine ownership. No file in `docs/21` through `docs/30` is SQL or authorizes a migration. Every future migration must cite the affected contract rows, enum/domain changes, relationships, RLS class, retention and rollback/forward-recovery plan.

## Contract Metrics

| Metric                                    |                                                                      Contract value |
| ----------------------------------------- | ----------------------------------------------------------------------------------: |
| Physical application tables               |                                                                                 169 |
| Protected public/materialized projections |                                                      1 (`certificate_public_views`) |
| Logical enum contracts                    |                                                                                  52 |
| Standards/data-backed controlled domains  |                                                                                   7 |
| Declared foreign-key relationships        |                                                    312 named business relationships |
| Immutable/evidence tables                 |                                                                                  30 |
| PII-bearing tables                        |                                                                                 118 |
| Audit/evidence tables                     | 30 append-only evidence/telemetry ledgers; 2 are dedicated audit/export authorities |
| Realtime-enabled tables                   |                                                                                  12 |

Counts are contract invariants and are validated before commit. A later change updates the catalog, relationship map, metrics and an ADR together.

## Database Scope

- **Engine:** PostgreSQL 17 managed by Supabase.
- **Application schema:** `public` initially, with security-definer helpers isolated in a future protected schema if Phase 1 ADR approves it.
- **Managed schemas:** Supabase owns `auth`, `storage`, `realtime`, `vault`, `cron` and extension-managed schemas. SYRA migrations do not modify managed internals.
- **Identity authority:** `auth.users`; `public.profiles` is the one-to-one application identity.
- **Tenant authority:** `organizations`; `organization_id` is the canonical tenant foreign key.
- **Object bytes:** Supabase Storage; `storage_objects` is SYRA metadata/ownership, not a replacement for `storage.objects`.

## Non-Negotiable Invariants

1. UUID primary keys for application entities and events. Composite primary keys are permitted only for pure junction/projection tables.
2. All instants use `timestamptz` in UTC. Calendar-only values use `date`; durations use integer seconds.
3. Every tenant-owned table has `organization_id uuid not null`, except a documented bootstrap/global row.
4. Do not duplicate `tenant_id` beside `organization_id`. `tenant_id` is allowed only in a future physical sharding layer with an ADR.
5. Mutable aggregates use `created_at`, `updated_at`, `created_by`, `updated_by` where attribution is meaningful. Append-only facts use server-owned `occurred_at`/`created_at` and never `updated_at` or `deleted_at`.
6. `deleted_at` exists only for reversible business hiding where history remains necessary. Privacy erasure is a controlled delete/redact/anonymize operation, not soft delete.
7. Published artifacts are immutable versions. Stable identity tables point to versions; enrollments/attempts/certificates retain the exact version.
8. Money is integer minor units plus ISO 4217 currency. Scores use constrained `numeric`, never floating point.
9. JSONB is allowed for versioned content, provider payloads and validated flexible metadata; it cannot hide tenant, identity, status, authorization, relationship or indexed filter fields.
10. RLS is enabled and forced for every exposed tenant table. No `authenticated USING (true)` write policy.
11. Service role is workload-only. Interactive Platform/Super Admin does not bypass immutable evidence or gain blanket PII access.
12. Foreign-key columns are indexed unless an existing composite index has them as the useful leading prefix.
13. Public access uses a narrow function/projection and non-enumerable key; base records remain private.
14. High-volume facts are partition-ready and use cursor-based access. No offset pagination on unbounded production collections.

## Canonical Names And Compatibility Register

Prompt #005 expected names are coverage requirements. Existing approved names remain canonical where they already express the same entity.

| Expected/legacy name                    | Canonical contract                                            | Resolution                                                        |
| --------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `user_preferences`                      | `user_settings`                                               | Existing name retained; API may say preferences                   |
| `user_roles`                            | `member_role_assignments`                                     | Scoped grant, not one global user role                            |
| `invitations`                           | `organization_invitations`                                    | Tenant scope explicit                                             |
| `tracks`                                | `learning_tracks`                                             | Existing engine-neutral name retained                             |
| `modules`                               | `course_modules`                                              | Avoid collision with software modules                             |
| `resources`                             | `learning_resources`                                          | Content ownership explicit                                        |
| `question_bank`                         | `question_banks` + `questions`                                | Bank and item identities remain separate                          |
| `assessment_questions`                  | `assessment_form_items`                                       | Immutable form item links to question version                     |
| `attempt_answers`                       | `attempt_responses`                                           | Supports non-answer response types                                |
| `answer_reviews`                        | `answer_reviews`                                              | Added as reviewer/appeal detail, distinct from evaluation         |
| `certificate_verifications`             | `certificate_verification_events`                             | Append-only access telemetry; public data is projection           |
| `certificate_revocations`               | `certificate_status_events`                                   | One append-only status history for expiry/revoke/renew            |
| `mentor_reviews`                        | `learner_reviews`                                             | Existing learner-centered record retained                         |
| `interventions`                         | `mentor_interventions`                                        | Owner engine explicit                                             |
| `forums`, `forum_topics`, `forum_posts` | `discussion_spaces`, `discussion_threads`, `discussion_posts` | Generic community vocabulary retained                             |
| `forum_replies`                         | `discussion_posts.parent_post_id`                             | Replies are posts with self-reference; no duplicate table         |
| `notification_logs`                     | `notification_deliveries`                                     | Provider attempts/outcomes                                        |
| `ai_generations`                        | `ai_interactions`                                             | One provider-neutral generation/interaction authority             |
| `ai_provider_logs`                      | `ai_provider_logs`                                            | Added as redacted AI adapter telemetry                            |
| `consents`                              | `consent_records`                                             | Current state separate from append-only events                    |
| `consent_versions`                      | `privacy_notice_versions` + `consent_events`                  | Notice versions and receipt history have different owners         |
| `audit_logs`, `audit_evidence`          | `audit_events`, `evidence_exports`                            | Append facts and signed export manifests                          |
| `companies`                             | `organizations` + `hiring_partners`                           | Legal tenant plus verified partner profile; no duplicate identity |
| `job_postings`                          | `opportunities`                                               | Job/internship discriminator prevents schema drift                |
| `internships`                           | `internship_details`                                          | Optional subtype details keyed one-to-one to opportunity          |
| `placement_events`                      | `application_stage_events`                                    | Application-centered append-only timeline                         |
| `candidate_visibility`                  | `candidate_visibility_grants`                                 | Purpose/partner/opportunity/expiry-bound policy                   |
| `candidate_reveal_logs`                 | `pii_reveal_events`                                           | Immutable PII access evidence                                     |
| `system_settings`                       | `system_config_versions`                                      | Versioned platform configuration                                  |
| `webhooks`                              | `webhook_subscriptions`                                       | Delivery attempts are separate                                    |
| `media_assets`                          | `storage_objects`                                             | Governed metadata for Supabase Storage objects                    |

No compatibility view is created merely to preserve a legacy document name. API compatibility belongs in service mapping unless a real deployed database contract requires a view and ADR.

## Domain Inventory

| Domain                                    |  Tables | Primary owner engines                                                      |
| ----------------------------------------- | ------: | -------------------------------------------------------------------------- |
| Identity, tenant and platform trust       |      18 | Identity, Organization, Authorization, Profile, Platform Admin             |
| Learning catalog and delivery             |      29 | Track, Course, Module, Lesson, Versioning, Media, Cohort, Progress, Search |
| Assessment and evaluation                 |      24 | Question Bank, Assessment, Assignment, Evaluation, Analytics               |
| Certificates                              |       6 | Certificate, Certificate Verification                                      |
| Mentor, engagement and community          |      19 | Mentor, Intervention, Notification, Announcement, Discussion, Gamification |
| AI and recommendation                     |      12 | AI engines, Recommendation, Integration                                    |
| Career, hiring and placement              |      15 | Hiring Partner, Candidate Visibility, Placement, Internship                |
| Compliance and evidence                   |      14 | Compliance, Consent, PII Protection, Audit Evidence                        |
| Billing and subscription                  |      10 | Billing, Payment, Subscription                                             |
| Developer, workflow, event and operations |      22 | Developer API, Webhook, Workflow, Event, Analytics, Security Monitoring    |
| **Total**                                 | **169** | 55-engine architecture                                                     |

## Contract Document Map

- `docs/22-master-enum-catalog.md`: logical enum and standards-backed domains.
- `docs/23-master-table-catalog.md`: all physical relations and per-table metadata.
- `docs/24-database-relationship-map.md`: cardinality, cascade/restrict/null and self-reference map.
- `docs/25-postgres-design-standards.md`: PostgreSQL 17 types, keys, constraints, indexes, partitions and extensions.
- `docs/26-supabase-design-standards.md`: Auth, RLS, Storage, Realtime, Edge Functions, Cron and Vault.
- `docs/27-search-and-index-strategy.md`: keyword, full-text, trigram and future vector search.
- `docs/28-database-security-matrix.md`: per-table security classes and role/service access.
- `docs/29-database-performance-strategy.md`: query, index, partition, aggregate, cache and archive contract.
- `docs/30-database-open-decisions.md`: unresolved ADRs and migration blockers.

## Migration Admission Checklist

A migration is rejected unless it:

- cites owner engine and canonical table/enum rows;
- states tenant/global classification and RLS class;
- defines PK/FK/on-delete, unique/check/index and null/default semantics;
- identifies PII/encryption/audit/retention/partition/realtime/search/analytics effects;
- updates generated TypeScript types and relationship/security tests;
- includes forward recovery, rollback limitations and data backfill plan;
- proves backward compatibility or records a versioned deprecation ADR;
- contains no undocumented table, status string, provider payload or service-role bypass.

## Official Platform Basis

The standards align with PostgreSQL 17 documentation and current official Supabase guidance for [database extensions](https://supabase.com/docs/guides/database/extensions), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Cron](https://supabase.com/docs/guides/cron), [Vault](https://supabase.com/docs/guides/database/vault) and [Edge Functions](https://supabase.com/docs/guides/functions).
