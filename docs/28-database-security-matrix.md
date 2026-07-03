# Database Security Matrix

## Resolution Model

Every table row in `docs/23-master-table-catalog.md` carries one or more `S0`-`S9` security classes. The matrix below is therefore the per-table access matrix: resolve the table's class, then apply its row relationship and listed exceptions. Multiple classes are cumulative only for their stated projection; they never broaden base-row access.

Access codes:

- `-` denied.
- `R` read safe projection.
- `O` own rows.
- `A` assigned-resource rows.
- `T` tenant rows with explicit permission.
- `E` approved enterprise descendants/aggregate.
- `P` platform operation safe projection.
- `W` workload-only service operation.
- `X` exact-token public projection only.

## Class Matrix

| Class                     | Public      | Authenticated     | Student                                       | Mentor                                   | Org Admin                                         | Enterprise Admin                    | Platform Admin                    | Super Admin            | Service role             |
| ------------------------- | ----------- | ----------------- | --------------------------------------------- | ---------------------------------------- | ------------------------------------------------- | ----------------------------------- | --------------------------------- | ---------------------- | ------------------------ |
| `S0` public/reference     | R published | R                 | R                                             | R                                        | R                                                 | R                                   | P manage where assigned           | P manage with step-up  | W maintenance            |
| `S1` authenticated global | -           | R safe            | R safe                                        | R safe                                   | R safe                                            | R safe                              | P                                 | P                      | W                        |
| `S2` self-owned           | -           | O                 | O                                             | O for own plus separate assignment class | O plus T only with permission                     | O/E safe                            | P support grant only              | same as Platform Admin | W purpose-specific       |
| `S3` tenant member        | -           | active membership | T member-safe                                 | A/T safe                                 | T                                                 | E safe                              | P support grant only              | same as Platform Admin | W purpose-specific       |
| `S4` scoped staff         | -           | -                 | own released projection only                  | A                                        | T with capability                                 | E with capability/aggregate default | P metadata/support grant          | same as Platform Admin | W purpose-specific       |
| `S5` tenant admin         | -           | -                 | -                                             | - unless separately granted              | T manage                                          | E manage approved descendants       | P metadata/support grant          | same as Platform Admin | W purpose-specific       |
| `S6` platform operator    | -           | -                 | -                                             | -                                        | -                                                 | -                                   | P manage                          | P time-bound/step-up   | W maintenance            |
| `S7` compliance/security  | -           | -                 | own safe receipt/case/history where specified | own-action safe only                     | explicit compliance capability, not admin default | explicit case scope                 | P metadata or approved case grant | no blanket bypass      | W controlled job         |
| `S8` service-only         | -           | -                 | -                                             | -                                        | -                                                 | -                                   | operator metadata only            | operator metadata only | W validated function/job |
| `S9` exact-token public   | X           | X                 | X                                             | X                                        | X                                                 | X                                   | X                                 | X                      | W refresh/lookup         |

`Super Admin` is a break-glass operational role, not a database superuser and not a service-role alias.

## Mutation Matrix

| Table characteristic             | Student                                         | Mentor/staff            | Tenant admin                     | Platform/Super Admin                    | Service role                           |
| -------------------------------- | ----------------------------------------------- | ----------------------- | -------------------------------- | --------------------------------------- | -------------------------------------- |
| Self-owned mutable (`S2`, A0/A1) | create/update allowlist while lifecycle permits | own only                | controlled tenant command        | support command only with grant         | approved worker only                   |
| Tenant mutable (`S3/S4/S5`, A1)  | domain command only                             | assigned command        | permission-scoped command        | platform-owned command or support grant | validated worker/function              |
| Global reference (`S0/S1`)       | read published                                  | read                    | read/tenant extension if allowed | assigned platform publisher             | deployment/worker                      |
| Append-only evidence (`A2`)      | constrained append function or own read         | constrained append/read | read with audit permission       | no update/delete                        | append/retention function only         |
| Service-only (`S8`)              | -                                               | -                       | metadata/status projection only  | operator metadata                       | full operation bounded by job/function |
| Public projection (`S9`)         | exact-token read                                | exact-token read        | exact-token read                 | exact-token read                        | refresh/lookup                         |

## Table-Class Index

The catalog is authoritative; this summary makes high-risk groups explicit.

| Class/group              | Tables                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public/reference `S0/S1` | published tracks/categories/courses/versions/modules/lessons/resources/paths/tags, permission registry, plans/prices, public organization metadata, privacy notices                     |
| Self `S2`                | profiles/settings/devices, enrollments/progress/notes/bookmarks/favorites/study plans, own attempts/results/certificates/notifications/consent/privacy cases/career/application history |
| Tenant/member `S3`       | organizations/member-safe data, cohorts/discussions/announcements, private catalog and opportunity safe projections                                                                     |
| Scoped staff `S4`        | authoring/question/assessment/evaluation, assigned mentor learner projections, credential operations, placement/partner workflows, reports/analytics                                    |
| Tenant admin `S5`        | memberships/roles/settings/cohorts/enrollments/templates/reports/billing/API/webhook configuration                                                                                      |
| Platform `S6`            | system config, flags, global catalog, provider/integration configuration, partner verification and support grants                                                                       |
| Compliance/security `S7` | consent events, privacy cases, retention/legal holds, audit/evidence, PII reveal, security alerts/cases and integrity evidence                                                          |
| Service-only `S8`        | answer keys, idempotency/rate limits, access tokens/grants, inbound payloads, background/workflow/event transport, AI protected content and provider workers                            |
| Public exact `S9`        | `certificate_public_views` only                                                                                                                                                         |

## High-Risk Table Exceptions

### Identity And Auth

- `auth.users`: only Supabase Auth/service operations; application users never select the managed table directly.
- `user_sessions`: self may receive a safe active-session projection; only security workload appends/ends observations.
- Invitation email/token fields are never returned together; tokens are accepted as input and compared by hash.

### Assessment

- `question_answer_keys` is `S8`: no learner, mentor, ordinary instructor client or broad admin select. Evaluator database functions consume only what scoring requires.
- Attempt responses are writable by owner only while active and before server expiry/submission. Submitted rows become immutable.
- Mentors see released score/progress for assigned cohorts, not raw answers unless a separate evaluator assignment exists.

### Certificates

- Anonymous access never touches `certificates`; exact token resolves `certificate_public_views` only.
- Revocation/expiry appends `certificate_status_events`; no role updates/deletes status history.

### AI

- General application logs and analytics cannot select `ai_interaction_content`.
- User sees own retained content; reviewers need engine-specific assignment/purpose. Platform admin sees metadata unless explicit approved investigation grant.
- Provider/service workload decrypts content just in time and never returns service credentials.

### Consent, Privacy And Audit

- Organization Admin does not automatically read privacy case details, legal holds, consent evidence or audit payloads.
- Subjects see own safe receipts/case timeline; compliance staff use explicit case scope.
- A2 rows have no update/delete policy for interactive roles. Retention action uses separately controlled function and legal-hold checks.

### Candidate PII Reveal

- Hiring partners query `candidate_search_profiles` only under active verified partner/opportunity/visibility predicates.
- `pii_access_grants` is service-only; raw token hash is never returned.
- Actual fields are returned only when the same transaction validates current policy and appends `pii_reveal_events`.
- No Platform/Super Admin override, bulk read, prefetch or shared cache exists.

### Billing And Operations

- Payment/webhook payloads are service-only; billing admins receive normalized status/amount/invoice projections.
- API/webhook secrets are shown once at creation when applicable, then only hashed/encrypted.
- Event/workflow payload access is restricted by owning workload and classification; operator UIs display redacted metadata.

## RLS Policy Requirements

For every table:

1. Define role, operation and row predicate separately for select/insert/update/delete.
2. Add `WITH CHECK` for insert/update and prove tenant/owner fields cannot be reassigned.
3. Resolve membership/permission from current database state, not caller-provided organization or stale JWT custom claims.
4. Use explicit parent existence predicates for child content/progress/assessment visibility.
5. Index every policy predicate and test `EXPLAIN` under realistic cardinality.
6. Avoid recursive policy reads; use protected helper functions with fixed search path when necessary.
7. Revoke default/public function execution and table grants before adding intended policies.

## Service Role Contract

Service role is permitted only for named workloads: verified provider webhooks, notification/webhook workers, certificate generation/expiry, rights/retention execution, report/bulk jobs, event/workflow dispatch, search indexing and security monitoring. Each validates a signed provider event or claimed job, resolves tenant explicitly, calls narrow domain functions, records correlation/audit and returns no unrestricted data to clients.

## Security Test Matrix

Each physical table receives direct Supabase CRUD tests for applicable roles across tenant A, tenant B, enterprise siblings, shared multi-membership identity, expired/revoked assignment and service workload. High-risk tests include FK tenant smuggling, answer-key leakage, stale token, consent withdrawal race, PII reveal atomicity, public enumeration, Storage path abuse, Realtime payload authorization and immutable update/delete denial.
