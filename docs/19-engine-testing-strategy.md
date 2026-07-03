# Engine Testing Strategy

## Quality Model

The legacy QA checklist contributes 148 useful intents across functional, UX, performance, accessibility, security, DPDP and integration domains. Its Django/JWT/Celery/Redis tooling assumptions are replaced with Supabase Auth/RLS, Server Actions/Route Handlers, database-backed workflows, Realtime and provider adapters.

Every engine must pass:

1. **Unit:** pure rules, schemas, state machines, calculations and redaction.
2. **Database/RLS:** migration constraints, functions and positive/negative policies with at least two tenants.
3. **Integration:** engine service with Supabase and provider adapter contract.
4. **Event/workflow:** schema, idempotency, retry, replay, order and compensation.
5. **UI/component:** semantics, keyboard/focus, states and reduced motion where UI exists.
6. **E2E:** critical role journey under realistic session/tenant boundaries.
7. **Non-functional:** security, privacy, accessibility, performance, reliability and observability.

## Engine Test Matrix

| Engines                                   | Highest-value unit/property tests                          | Required integration/security tests                                  | E2E/performance focus                                           |
| ----------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Identity, Profile                         | session/recovery states, profile allowlist                 | Supabase Auth hooks, enumeration, fixation, revoke, overposting      | registration/verification/recovery; auth burst limits           |
| Authorization, Organization               | delegation lattice, hierarchy cycle, scope/date            | two-tenant and sibling CRUD denial, stale claims, last-owner         | role grant/revoke and organization switching latency            |
| Track, Course, Module, Lesson, Versioning | publication state machines, ordering, source hash          | draft/published RLS, immutable rows, sanitization                    | author-review-publish and catalog cache/load                    |
| Media / Storage                           | path/class/size/MIME policy                                | Storage RLS, signed expiry, malware/polyglot, orphan cleanup         | upload/scan/download; large object concurrency                  |
| Progress                                  | monotonic projection, idempotent event fold, unlock rules  | self/mentor RLS, offline replay, event order                         | resume/complete/unlock; high-rate checkpoints                   |
| Assessment, Question Bank                 | timer/attempt/score/form properties, key separation        | answer-key leakage, transactional expiry/submit, RLS                 | autosave/reconnect/pass/fail/retake; submission spikes          |
| Assignment, Evaluation                    | submission freeze, rubric totals, override chain           | private artifacts, evaluator scope, AI proposal separation           | upload-to-release/appeal; evaluator queue scale                 |
| Certificate, Verification                 | eligibility/idempotency/status lifecycle                   | public projection/enumeration/cache revocation, artifact hash        | issue/download/verify/revoke; verification abuse load           |
| Gamification                              | rule/idempotency/reversal ledger                           | source event authenticity, opt-in leaderboard                        | award/reversal/streak; event replay volume                      |
| Notification, Announcement                | preference/purpose/template/audience states                | provider contracts, consent/unsubscribe, signed callback             | delivery/retry/ack; bulk fan-out and reconnect                  |
| Discussion                                | edit/moderation/report state and sanitizer                 | enrollment/cohort RLS, XSS/abuse, Realtime authorization             | post/report/moderate; cursor/load and live updates              |
| Mentor, Cohort, Intervention              | assignment dates, risk rules, nudge quota                  | unrelated learner denial, consent, notes encryption                  | dashboard->drawer->nudge/review; cohort aggregate p95           |
| Reporting, Analytics                      | metric reconciliation, suppression, pseudonymization       | field allowlist/export access, small-cell/cross-tenant               | request/download/expiry; large report and late events           |
| Compliance, Consent, Audit, PII           | purpose matrix, deadlines, holds, hash/append rules        | receipt/withdrawal, rights discovery, immutable denial, crypto       | consent/rights/retention/audit review; restore deletion reapply |
| AI Tutor/Assistant                        | context selection, schema, citations, budgets              | prompt injection, data leakage, tool reauth, provider contract       | streaming/cancel/refusal/feedback; latency/cost                 |
| AI Mentor/Evaluation/Recommendation       | confidence/review, ranking, explanation                    | assignment, fairness slices, protected traits, human override        | review workflow; benchmark quality/regression                   |
| AI Content/Translation/Voice              | source/provenance, glossary, session state                 | draft-only, legal review, voice consent/ephemeral media              | generate/review; audio latency/caption accessibility            |
| Billing/Subscription/Payment              | lifecycle/order/amount/currency/idempotency                | signed fixtures, duplicate/out-of-order/reconcile, no card data      | sandbox checkout->webhook->entitlement; burst webhooks          |
| Enterprise/Platform Admin                 | descendant scope, support grant/expiry                     | sibling denial, step-up, dual approval, no PII bypass                | policy rollout/support/break-glass; large hierarchy             |
| Placement/Internship/Hiring Partner       | opportunity/application transitions, validation            | party RLS, partner suspension, protected-trait exclusion             | partner publish->application->stage; pipeline scale             |
| Candidate Visibility                      | field/purpose/expiry policy and projection                 | two-partner isolation, withdrawal race, atomic evidence, anti-scrape | redacted search->request->reveal/history; abuse/load            |
| Developer API/Webhook                     | scope, pagination, error/idempotency contracts             | hashed key, signature/replay/SSRF, response PII schema               | key rotate/API call/webhook replay; quota/load                  |
| Feature Flag/Workflow/Event               | deterministic evaluation, step state, schema compatibility | crash/replay/poison/order/safe default, no gate bypass               | rollout/rollback and job recovery; lag throughput               |
| Integration/Security Monitoring           | error/circuit/dedupe/rule states                           | secret leak, region/egress, alert access/containment                 | provider degradation/incident exercise; alert storm             |

## RLS Test Standard

For each table and operation:

- create tenant A, tenant B, enterprise parent/siblings, partner tenant and multi-membership actor;
- test anonymous, student, mentor, instructor, organization/enterprise/platform admin, super admin, partner and TPO as applicable;
- test active, expired, revoked and suspended grants/memberships;
- execute direct Supabase select/insert/update/delete, not only application routes;
- verify `WITH CHECK` prevents tenant reassignment/foreign-key smuggling;
- prove service-role functions reject caller-supplied actor/tenant and invalid provider/job evidence;
- inspect query plans for indexed policy predicates and recursion.

## Event And Workflow Tests

- Golden JSON schema fixture per event version.
- Same event delivered twice has one effect.
- Consumer crash before/after effect/checkpoint is recoverable.
- Out-of-order aggregate versions defer/reconcile safely.
- Poison event isolates without blocking partition/tenant.
- Workflow retries transient failures only and compensation/manual path is observable.
- Cancellation and permission/consent revocation before sensitive step prevent execution.
- Replay does not resend notification, recharge payment, reissue certificate or duplicate PII reveal.

## AI Evaluation Harness

Each engine benchmark is versioned by engine/config/prompt/model and contains normal, edge, adversarial and privacy cases. Required measures include structured-output validity, groundedness/citation, correctness, refusal, prompt-injection resistance, PII/answer leakage, safety, latency, token/cost and regression. High-risk engines add human agreement, subgroup fairness, override/appeal and false-positive/negative thresholds.

No production rollout occurs on “looks good” review. Thresholds, benchmark ownership and rollback model/version are recorded.

## UI And Accessibility

- Component tests for loading, empty, error, success, disabled/pending and optimistic rollback.
- Keyboard-only critical journey, logical focus after modal/drawer/navigation and visible focus.
- Screen-reader labels/status/live-region behavior, including Realtime events.
- WCAG 2.2 AA contrast, 200% zoom/reflow, reduced motion and light/dark/system themes.
- Responsive checks at mobile/tablet/desktop with long localized text and no overlap.
- Automated axe is a floor; manual screen-reader and keyboard tests remain release gates.

## Performance Baselines

Targets are approved per phase and measured at p50/p95/p99. Initial legacy intents retained as validation candidates, not unconditional contracts: user pages LCP <=2.5s on representative mobile network, mentor read APIs/projections p95 <=400ms under normal load, Realtime update <=2s and reconnect <=5s. Production SLOs require Phase 14 ownership and capacity evidence.

Load tests cover 100,000 learners, 10,000 courses, millions of attempts, 1,000 organizations, attempt submission bursts, activity/event ingestion, mentor cohort views, certificate verification, webhook storms, bulk enrollment and report generation. Data cardinality and RLS are realistic.

## Security And Privacy Testing

- OWASP ASVS-inspired auth/session/input/upload/CSRF/XSS/SSRF/header/rate/secret tests.
- Dependency, lockfile, secret and client-bundle scans in CI.
- Threat-model abuse cases for assessment keys, service role, public verification, exports, AI tools and PII reveal.
- Rights discovery completeness, deletion/anonymization/hold, consent withdrawal and backup restore reapply.
- Penetration test and privacy/counsel review before launch; no critical/high finding without formal acceptance.

## Release Gates

All blocker/critical tests pass. Major findings need named owner, approved risk acceptance and remediation date. Flaky tests are defects, not retries-as-policy. CI artifacts preserve reports; production release links test run, migration/RLS evidence, accessibility result, dependency scan and rollback/forward-recovery plan.
