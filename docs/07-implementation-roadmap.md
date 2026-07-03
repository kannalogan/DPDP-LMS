# Implementation Roadmap

## Delivery Rules

- A phase starts only after its inputs and human decisions are available. Security/RLS, accessibility and observability are acceptance criteria, not later cleanup.
- Schema changes use reviewed migrations plus rollback/forward-recovery notes. Applied migrations are immutable.
- Every feature ships behind tenant-aware authorization and production monitoring. No UI-only authorization is accepted.
- Screens listed below describe future delivery scope; this roadmap does not implement them.

## Phase 0 — Engineering Foundation Verification

**Goal:** Prove Prompt #002 foundation under the supported Node 22 runtime and resolve scaffold/schema drift.

**Likely files:** `package.json`, lockfile, CI workflows, environment/config, security/observability libraries, test configs, architecture docs.

**Tables:** None created. Review existing `0001_core_learning_platform.sql` against the approved blueprint and decide reset versus forward reconciliation before any shared environment.

**Services:** Vercel project configuration, Supabase local/staging projects, secret management and GitHub environments.

**Screens:** None.

**Acceptance criteria:** Clean install; lint/typecheck/format/unit/build pass on Node 22; preview deployment; health/readiness/version endpoints; environment validation; dependency audit policy; migration strategy decision.

**Security checks:** Secret scan, CSP/header verification, no service-role exposure, dependency review, branch/environment protection.

**Tests:** CI smoke, production build, middleware headers, environment failure cases, artifact restore.

**Risks:** Existing migration may have been applied; GitHub/Vercel/Supabase permissions and Node runtime inconsistency.

## Phase 1 — Database And Supabase Setup

**Goal:** Implement the reviewed tenancy/RBAC foundation and database testing harness before product features.

**Likely files:** `database/migrations/*`, `database/tests/*`, `supabase/config.toml`, generated database types, local seed references, data runbooks.

**Tables:** `profiles`, organizations/domains/members, roles/permissions/assignments, settings, feature flags, processing purposes, audit events and supporting idempotency/job tables required by setup.

**Services:** Supabase PostgreSQL/Auth/Storage configuration, migration deployment and backup/restore process.

**Screens:** None; operational verification only.

**Acceptance criteria:** Reproducible local/staging schema; generated types; indexes/FKs; migration rollback/forward plan; backup and point-in-time recovery policy; no unowned table.

**Security checks:** RLS enabled by migration transaction, fixed-search-path helper functions, grants review, two-tenant isolation, append-only audit enforcement.

**Tests:** pgTAP/schema tests, RLS positive/negative matrix, migration from empty database, realistic query plans.

**Risks:** Recursive/slow RLS, insufficient Supabase plan capabilities, data residency decision not made.

## Phase 2 — Auth, RBAC And Tenant Isolation

**Goal:** Deliver secure identity onboarding, organization selection and scoped permission enforcement.

**Likely files:** `features/auth`, `features/organizations`, `features/rbac`, `app/(auth)`, middleware/server guards, integration/E2E tests.

**Tables:** profiles, organizations, memberships, invitations, roles, permissions, assignments, user/organization settings, audit events.

**Services:** Supabase Auth email flows, Resend transactional email, optional MSG91 verification after policy approval.

**Screens:** Sign in/recovery/MFA, invitation acceptance, organization switcher, profile, member/role management.

**Acceptance criteria:** Invite-to-membership flow; multi-organization switching; server-authoritative permissions; session revocation; accessible account recovery; audited role changes.

**Security checks:** MFA policy for privileged users, no open redirect/account enumeration, invitation token hashing/expiry, last-owner protection, stale-claim tests.

**Tests:** Auth integration, every role/tenant boundary, invitation replay/expiry, session fixation/revocation, Playwright critical flows.

**Risks:** Enterprise hierarchy and SSO requirements unresolved; email/SMS deliverability.

## Phase 3 — Core Learning Engine

**Goal:** Deliver generic versioned catalog, enrollment, learning delivery and progress independent of DPDP.

**Likely files:** `features/learning-catalog`, `features/learning-delivery`, `services/storage`, student/content-admin routes, database migrations/tests.

**Tables:** tracks, courses/versions, modules, lessons/versions, resources/storage metadata, paths/items, cohorts/members, enrollments, progress/activity/video, notes/bookmarks/search documents.

**Services:** Supabase Storage grants, search projection, progress event processing and notification intents.

**Screens:** Catalog, course detail, authoring/version review, enrollment management, course player, notes/bookmarks and progress.

**Acceptance criteria:** Publish immutable versions; assign/enroll; resume learning; completion projection; accessible media metadata; tenant-private and global catalog behavior.

**Security checks:** Draft/tenant content isolation, signed asset expiry, file validation, progress anti-tamper rules, private notes isolation.

**Tests:** Version transitions, content authorization, progress idempotency, Storage policies, keyboard/screen-reader player tests, load tests for catalog/progress.

**Risks:** Content format/editor choice, video delivery provider and offline/mobile requirements.

## Phase 4 — DPDP Track Content Engine

**Goal:** Configure DPDP as reviewed track content and a versioned compliance pack without platform hardcoding.

**Likely files:** DPDP content import tooling/data, compliance-pack feature extensions, content validation and traceability docs.

**Tables:** generic track/course/content tables plus approved compliance control/taxonomy associations introduced by a reviewed schema amendment.

**Services:** Content import, source/reference validation, translation workflow and SME approval.

**Screens:** DPDP track/course administration, control-to-content traceability and learner catalog pages.

**Acceptance criteria:** SME-approved outcomes/content; statutory source/effective-date traceability; organization assignment; law-change version workflow; no DPDP branch in generic services.

**Security checks:** Copyright/source permissions, content publication approval, tenant customization boundaries.

**Tests:** Import validation, version diff, link/reference checks, track regression and content accessibility.

**Risks:** Legacy DPDP/GRC documents are absent; counsel/SME approval and localization scope unresolved.

## Phase 5 — Assessment Engine

**Goal:** Deliver reusable quizzes, exams and assignments with protected keys, retakes and reviewable evaluation.

**Likely files:** `features/assessments`, assessment routes/components, Storage submission adapter, migrations/RLS/tests.

**Tables:** banks, questions/versions/options/keys, rubrics/criteria, assessments/versions/forms/assignments, attempts/items/responses/submissions, evaluations/scores, retake grants, integrity events/review cases.

**Services:** Transactional attempt submission/scoring, signed submission storage, notification and future AI evaluation contract.

**Screens:** Authoring/review, learner quiz/exam/assignment, result, evaluator queue, retake/integrity/appeal case.

**Acceptance criteria:** Versioned forms; timed attempt lifecycle; autosave and atomic submission; deterministic scoring; rubric evaluation; released result; retake policy; appeals.

**Security checks:** Answer-key non-disclosure, server time authority, submitted response immutability, scoped evaluators, no covert proctoring.

**Tests:** Boundary/time/race cases, randomized forms, scoring property tests, RLS/answer leakage, interruption/retry, accessibility and high-volume submission load.

**Risks:** Proctoring/identity policy, high-stakes legal requirements and evaluator workload.

## Phase 6 — Certificate Engine

**Goal:** Issue verifiable, expiring and revocable credentials from explicit eligibility policies.

**Likely files:** `features/certificates`, public verification route/page, PDF/artifact generation service, expiry worker, migrations/tests.

**Tables:** templates/versions, certificates, status events and public verification projection.

**Services:** Eligibility, artifact generation/Storage, scheduled expiry and notifications.

**Screens:** Template admin, credential list/detail, public verification, revoke/renew workflow.

**Acceptance criteria:** Idempotent issuance; immutable snapshot; high-entropy verification; status changes; accessible artifact; expiry/revocation reflected promptly.

**Security checks:** Anti-enumeration, minimal public fields, signed artifacts, status-event immutability, audited sensitive download/revocation.

**Tests:** Eligibility matrices, duplicate issuance, token brute-force rate limiting, public data leakage, PDF/accessibility snapshots, expiry jobs.

**Risks:** Accreditation/signatory/legal retention and PDF generation runtime choice.

## Phase 7 — Student Experience

**Goal:** Compose learning, assessment, credential, discussion, notification and gamification capabilities into an accessible student workspace.

**Likely files:** `app/(student)`, feature components/hooks, feedback/layout components and Playwright suites.

**Tables:** Existing learning/assessment/certificate tables plus notifications/preferences, discussions/posts/reports and gamification ledger.

**Services:** Realtime subscriptions, notification delivery and learner-safe analytics projections.

**Screens:** Student home, catalog/course player, progress, assessments/results, certificates, notifications, forum, profile/settings.

**Acceptance criteria:** Complete keyboard journey; responsive states; resumable learning; accurate unread/progress state; moderated discussions; no dashboard-only business logic.

**Security checks:** Self-only data, safe Realtime payloads, HTML/content sanitization, file/link protections and notification preference enforcement.

**Tests:** Critical E2E journeys, visual/responsive checks, WCAG automated/manual tests, slow/offline/error states and cross-tenant probes.

**Risks:** Gamification ethics, notification fatigue, localization and mobile media constraints.

## Phase 8 — Mentor Experience

**Goal:** Enable assigned mentors to monitor cohorts and deliver explainable, privacy-respecting interventions.

**Likely files:** `features/mentoring`, `app/(mentor)`, analytics queries and alert rules.

**Tables:** mentor assignments/interventions/reviews/risk signals plus cohort, progress and released assessment projections.

**Services:** Risk rule engine, notification intents, governed mentor reports.

**Screens:** Mentor dashboard, cohort/learner view, intervention/review forms, alerts and activity timeline.

**Acceptance criteria:** Assignment-bound visibility; explainable risk factors; recorded follow-up/outcome; learner-visible note policy; workload filters.

**Security checks:** Immediate access removal on assignment end, sensitive-note encryption, no unrelated learner or hidden assessment access.

**Tests:** Cohort RLS matrix, assignment date boundaries, risk-rule fixtures, report suppression, E2E intervention lifecycle.

**Risks:** At-risk definitions, bias, mentor-to-learner ratios and mental-health-sensitive handling.

## Phase 9 — Admin Experience

**Goal:** Deliver separate, permission-scoped operations for organization, enterprise, content, mentor, compliance and platform administrators.

**Likely files:** `app/(admin)`, `app/(enterprise)`, relevant feature admin components/actions, audit/report queries.

**Tables:** Existing ownership tables, settings/config/flags, audit/evidence and report exports.

**Services:** Bulk import/enrollment jobs, report generation and support-access workflow.

**Screens:** Members/roles, cohorts/enrollment, catalog/content, mentors, compliance cases, reports, feature/config operations.

**Acceptance criteria:** No universal admin page/service; bulk dry-run/idempotency; export expiry; enterprise rollups respect hierarchy; all privileged actions attributable.

**Security checks:** Permission per command, step-up auth for high risk, dual approval where required, PII minimization and support-access expiry.

**Tests:** Full admin permission matrix, bulk partial failure/replay, enterprise sibling isolation, audit completeness and large-table performance.

**Risks:** Role proliferation, enterprise hierarchy, support process and report-definition ambiguity.

## Phase 10 — AI Engines

**Goal:** Introduce governed AI incrementally from low-risk content assistance to reviewed high-risk capabilities.

**Likely files:** `features/ai`, `services/ai`, streaming route, evaluation datasets/tests, provider configuration.

**Tables:** AI config/prompt/interactions/content/usage/safety/feedback plus retrieval index amendment if approved.

**Services:** OpenAI/Claude/Gemini adapters, policy/redaction, retrieval, safety, cost and evaluation.

**Screens:** AI policy/admin, tutor, generated study aids, author review and human-review queues.

**Acceptance criteria:** Engine risk gates; citations; structured outputs; tenant/model allowlists; usage/cost; safe failure; feedback; benchmark thresholds.

**Security checks:** Prompt injection/privacy leakage testing, consent/purpose enforcement, no training configuration, provider region review, human oversight.

**Tests:** Provider contracts, golden benchmarks, adversarial/red-team, cancellation/retry, budget caps, bias/calibration for high-risk engines.

**Risks:** Provider terms/residency, hallucination, model drift, cost and consequential-decision liability.

## Phase 11 — Enterprise And Billing

**Goal:** Deliver enterprise organization management, subscriptions, entitlements, white-label configuration and governed billing.

**Likely files:** `features/billing`, enterprise features/routes, `services/billing`, payment webhooks, workers/tests.

**Tables:** billing accounts, plans/prices, subscriptions, invoices, payment events, entitlements plus organization hierarchy/settings.

**Services:** Stripe, Razorpay, invoice Storage, webhooks and entitlement reconciliation.

**Screens:** Plans/checkout, billing portal/status, invoices, seats/usage, enterprise organization tree and branding.

**Acceptance criteria:** Provider-neutral catalog; signed/idempotent webhook reconciliation; entitlement enforcement; cancellation/grace/refund behavior; no browser-authoritative payment state.

**Security checks:** No card storage, webhook signature/raw body, billing-role separation, tax-document protection and replay controls.

**Tests:** Provider fixtures, duplicate/out-of-order events, entitlement transitions, failed/partial payments, currency/tax rules and E2E sandbox checkout.

**Risks:** GST/tax/invoicing, seat/usage model, refunds, marketplace model and provider-country coverage.

## Phase 12 — Placement And Hiring Partner

**Goal:** Deliver consent-led career profiles, opportunities, applications and auditable partner PII reveal.

**Likely files:** `features/career`, `app/(career)`, partner/TPO routes, reveal functions, migrations/RLS/threat-model tests.

**Tables:** career profiles, hiring partners, opportunities, visibility/search projections, reveal requests/decisions/grants/events, applications/stages and mock interviews.

**Services:** Resume Storage, candidate projection, consent/reveal authorization, notifications and optional interview AI.

**Screens:** Career profile/consent/history, opportunity/application, partner search/request, TPO pipeline and reveal review.

**Acceptance criteria:** Redacted discovery; field/purpose/opportunity/expiry-bound reveal; atomic evidence; withdrawal stops future access; candidate history; application lifecycle.

**Security checks:** Dedicated threat model, partner verification, anti-scraping/export, no ranking on protected traits, immutable reveal log.

**Tests:** Every reveal denial/expiry/withdrawal case, two-partner isolation, evidence atomicity, search minimization, race and abuse/load tests.

**Risks:** Missing hiring reference, consent validity, partner misuse, ranking bias and employment-law obligations.

## Phase 13 — Analytics And Compliance

**Goal:** Deliver governed product/learning analytics, DPDP operations, rights/retention workflows and evidence reporting.

**Likely files:** `features/analytics`, `features/compliance`, workers, report exports, compliance admin routes/runbooks.

**Tables:** analytics/fact tables, purposes/notices/consent, privacy requests/events/actions, retention/legal holds/executions, evidence exports and audit partitions.

**Services:** Event ingestion/aggregation, rights discovery, retention execution, secure export and alerting.

**Screens:** Tenant analytics, consent/rights cases, retention/legal hold, access/reveal audit and evidence reports.

**Acceptance criteria:** Privacy thresholds; request SLA/escalation; idempotent action manifests; legal-hold enforcement; backup restoration deletion reapply; verifiable exports.

**Security checks:** Compliance permission separate from admin, report field allowlists/expiry, immutable evidence, pseudonymization and purpose checks.

**Tests:** Analytics reconciliation, cell suppression, rights discovery completeness, retention dry-run/execution, legal holds, evidence integrity and partition performance.

**Risks:** Counsel decisions, retention/residency, analytics re-identification and data-map incompleteness.

## Phase 14 — Hardening, Testing And Launch

**Goal:** Prove operational, security, privacy, accessibility and scale readiness for controlled production launch.

**Likely files:** All production modules, runbooks, dashboards/alerts, IaC/provider config where approved, test and release documentation.

**Tables:** No speculative new domains; finalize indexes/partitions/retention and production data migrations.

**Services:** Vercel/Supabase production, providers, monitoring/Sentry/PostHog/OpenTelemetry decisions, backup/DR and incident tooling.

**Screens:** All release journeys plus support/incident-safe operational views.

**Acceptance criteria:** SLOs/RTO/RPO approved; load/capacity passed; restore and incident exercises; security/privacy/legal sign-off; WCAG 2.2 AA audit; rollback/forward recovery; support readiness.

**Security checks:** Independent penetration test, threat-model closure, secret/key rotation, least-privilege audit, subprocessor review and breach exercise.

**Tests:** Full unit/integration/E2E, RLS matrix, contract/replay, accessibility/manual assistive tech, performance/soak/failover, restore and chaos scenarios.

**Risks:** Unclosed high-severity findings, provider production approval, operational staffing, migration volume and unresolved legal decisions.

## Definition Of Done For Every Phase

Code, schema, RLS and docs are reviewed; tests and telemetry are present; accessibility states are verified; threat/privacy changes are recorded; migrations and provider operations have recovery instructions; no critical/high finding is open without named risk acceptance; and the phase acceptance criteria are demonstrated in staging.
