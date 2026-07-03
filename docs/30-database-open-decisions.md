# Database Open Decisions

## Readiness Score

**Database design readiness: 88/100.** The logical contract, ownership, tables, enum domains, relationships, security classes, search, performance, retention and Supabase integration boundaries are defined. The score is not implementation readiness: no Prompt #005 SQL, migration, RLS policy, bucket or Supabase resource has been created.

| Area                              |  Weight |  Score | Gap                                                       |
| --------------------------------- | ------: | -----: | --------------------------------------------------------- |
| Engine/table ownership and naming |      15 |     15 | Complete                                                  |
| Table/column/key metadata         |      20 |     18 | Final field-level legal/product review pending            |
| Relationship/delete semantics     |      10 |      9 | Composite tenant FK choices require migration design      |
| RLS/security/privacy              |      20 |     18 | Policy SQL and adversarial tests belong to implementation |
| Retention/audit/immutability      |      10 |      9 | Counsel-approved durations/holds pending                  |
| Performance/search/partition      |      10 |      8 | Thresholds need representative benchmarks                 |
| Supabase/platform operations      |      10 |      7 | Region/plan/PITR/Storage recovery decisions pending       |
| Migration/backward compatibility  |       5 |      4 | Existing migration disposition pending                    |
| **Total**                         | **100** | **88** | Human ADRs below block implementation slices              |

## Blocking Decisions

| ID     | Decision                                               | Options / recommended default                                                                         | Owner                  | Required before                |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------ |
| DB-001 | Existing `0001_core_learning_platform.sql` disposition | Reset if no shared/production data; otherwise forward expand/migrate/contract                         | Data/Architecture      | Any new migration              |
| DB-002 | Supabase region/data residency/project topology        | Single India-nearest approved region initially; multi-region projects only with routing/transfer ADR  | Legal/Security/Ops     | Project creation/data load     |
| DB-003 | Enterprise hierarchy                                   | Single-parent tree recommended; affiliation graph deferred                                            | Product/Architecture   | Organization/RLS migration     |
| DB-004 | Application schema layout                              | `public` initially plus protected helper schema; multi-schema domains deferred                        | Data/Security          | Baseline migration             |
| DB-005 | Native enum policy                                     | Checked text/registries by default; native only stable domains marked in enum catalog                 | Data                   | Enum migration                 |
| DB-006 | UUID variant                                           | `gen_random_uuid()` random UUID now; UUIDv7 only after target support/index benchmark                 | Data/Ops               | PK migration                   |
| DB-007 | Event outbox retention and replay window               | Keep domain-required window, archive transport metadata; exact periods by event class                 | Architecture/Ops/Legal | Event tables                   |
| DB-008 | Workflow persistence detail                            | Implement definition/instance/step/event tables as cataloged; confirm lease/compensation semantics    | Platform/Architecture  | Workflow migration             |
| DB-009 | Application encryption/KMS                             | Environment-managed envelope keys recommended; Vault only for DB-owned integrations                   | Security/Ops           | P3/P4 fields                   |
| DB-010 | Role/permission seed ownership                         | Deployment-owned system registry plus tenant custom roles; define initial keys                        | Security/Product       | Authorization migration        |
| DB-011 | Certificate public projection implementation           | Normal view/function first; materialize only after verification scale benchmark with revocation SLO   | Data/Security          | Verification implementation    |
| DB-012 | Minor learners                                         | Safe default: prohibited until age assurance/guardian consent approved                                | Legal/Product          | Onboarding/profile fields      |
| DB-013 | Retention schedule                                     | Catalog defaults are engineering placeholders; counsel approves category/jurisdiction/contract matrix | Legal/Privacy          | Production data                |
| DB-014 | Audit tamper evidence                                  | Hash chain per partition/batch plus external anchor evaluation                                        | Security/Compliance    | Audit migration                |
| DB-015 | Partition thresholds/automation                        | Manual monthly partition management initially; `pg_partman` only after operations ADR                 | Data/Ops               | First P1/P2 migration          |
| DB-016 | Vector model/dimensions/index                          | No production embeddings until model, region, dimensions, recall and retention approved               | AI/Security/Data       | `search_embeddings` use        |
| DB-017 | Search language configurations                         | English + approved Indian locale rollout; define tokenization/stemming/fallback per locale            | Product/Search         | Search index migration         |
| DB-018 | Realtime topology                                      | Postgres Changes for low fan-out approved list; server Broadcast for job/workflow/high fan-out        | Platform/Ops           | Realtime publication           |
| DB-019 | Billing/tax/invoice model                              | Confirm GST/tax jurisdiction, invoice line items, refunds and currencies                              | Finance/Legal/Product  | Billing migration              |
| DB-020 | Hiring reveal approval                                 | Candidate-only, TPO-assisted or policy auto-approval; default candidate explicit approval             | Legal/Career/Privacy   | Candidate visibility migration |
| DB-021 | Assessment proctoring/integrity                        | No covert surveillance; define approved integrity signals and appeal                                  | Product/Legal/Security | Integrity tables/fields        |
| DB-022 | Backup/PITR and Storage recovery                       | Select Supabase plan/RPO/RTO; separate object backup and restore-deletion reapply                     | Ops/Security           | Production readiness           |
| DB-023 | Analytics warehouse                                    | PostgreSQL daily facts initially; external warehouse only after scale/privacy ADR                     | Analytics/Privacy      | Analytics expansion            |
| DB-024 | Data export formats                                    | JSON canonical; human-readable PDF optional; signed manifest/schema/version                           | Privacy/Product        | Rights/report implementation   |

## Non-Blocking Follow-Ups

- Localized labels for enum/role/permission registries.
- Formal naming conventions for indexes/constraints generated by migration tooling.
- Exact report/materialized-view definitions after UI/query contracts exist.
- Accreditation/verifiable-credential standards and certificate signing method.
- HRIS/SCIM external identifiers and provisioning semantics.
- Search synonym/glossary governance for DPDP and future tracks.
- External SIEM/warehouse/event broker criteria and vendor selection.
- Database archiving storage format and legal custody requirements.

## Architectural Risks

| Risk                                           | Impact                                 | Control / decision                                                             |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 169-table breadth implemented in one migration | Lock-in, review failure and unsafe RLS | Implement dependency waves; only create tables needed by approved phase        |
| Legacy migration already applied               | Rename/data/RLS conflict               | DB-001 environment inventory and forward reconciliation                        |
| Status domains drift between code/DB/events    | Invalid transitions and analytics      | Enum catalog + generated types + contract tests                                |
| RLS policy joins become recursive/slow         | Data leakage or latency                | Protected helpers, indexed predicates, two-tenant plan tests                   |
| Too many actor attribution FKs                 | Erasure blockage and write overhead    | Nullable actor FK + pseudonymous evidence; evaluate per table during migration |
| JSONB becomes a schema escape hatch            | Unqueryable/unsafe data                | Schema validation and mandatory relational authority fields                    |
| Realtime fan-out overloads database            | Delayed UI and DB contention           | 12-table allowlist, benchmark and server Broadcast                             |
| Vector search leaks/stales tenant content      | Cross-tenant disclosure                | source reauthorization, dedicated embedding relation, removal queue            |
| Partitioning complicates uniqueness/FKs        | Incorrect dedupe/evidence              | Threshold/constraint benchmark before partition migration                      |
| Service role becomes universal backend         | RLS bypass and blast radius            | named workloads, narrow functions, secret isolation and audit                  |
| Retention/erasure conflicts with evidence      | Legal/privacy failure                  | counsel matrix, legal holds, anonymization and restore reapply                 |
| Public certificate projection goes stale       | Revoked credential appears valid       | direct view/function or measured invalidation SLO                              |

## Decisions Already Closed

- `organization_id` is the tenant key; do not duplicate `tenant_id`.
- DPDP remains track/policy data, not platform-specific schema branches.
- Supabase Auth owns credentials/sessions; profile/session-observation tables do not compete.
- Scoped role assignments replace one global user role.
- Published content, assessment artifacts and policy versions are immutable.
- Answer keys are separately protected and never client-readable.
- Consent, audit, PII reveal, payment/status and workflow evidence is append-only.
- Candidate PII reveal has no administrative override, bulk export or prefetch.
- Payment provider webhooks, not browser redirects, determine payment state.
- AI outputs do not directly publish, grade, reveal PII or decide employment outcomes.
- Search/analytics/materialized views are rebuildable projections, not authority.

## Prompt #006 Recommendation

**Title:** `SYRA Prompt #006 - Phase 0 Database Reconciliation, ADR Closure And Migration Test Harness`

**Recommended scope:** inventory every Supabase environment and migration history; resolve DB-001 through DB-010/DB-022 as applicable; verify PostgreSQL 17 extension availability; establish local Supabase, migration/pgTAP/RLS test harness and generated TypeScript types; produce ADRs and an implementation-ready first-wave migration plan. Do not create the 169-table schema in one pass and do not implement product UI/auth flows.
