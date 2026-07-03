# Engine Security Rules

## Global Invariants

1. Supabase Auth proves identity; database state proves membership and permissions.
2. Every tenant-owned row carries/resolves indexed `organization_id`; cross-tenant denial is tested for every CRUD operation.
3. RLS is authoritative. Server checks improve errors; client checks improve UX.
4. Service role is workload-only, never a human or browser credential.
5. PII access requires actor, tenant, purpose, field scope and current legal/consent policy.
6. Answer keys, secrets, payment credentials and unrestricted PII never enter client bundles, events, logs or AI context.
7. Compliance-critical evidence is append-only without Platform/Super Admin mutation.
8. Public access uses narrow projection/function, non-enumerable identifiers and rate limits.

## Per-Engine Control Matrix

| #   | Engine                | Authorization/RLS rule                                          | Mandatory audit/evidence                      | Fail-closed condition                               |
| --- | --------------------- | --------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| 1   | Identity              | self session; privileged recovery/MFA policy                    | recovery, MFA, verification, revoke           | invalid/expired session or assurance                |
| 2   | Authorization         | active membership + scoped permission + date                    | every grant/revoke/delegation                 | resolver ambiguity/stale scope                      |
| 3   | Organization / Tenant | member/explicit enterprise descendant                           | create, parent/domain/status change           | tenant unresolved/hierarchy cycle                   |
| 4   | User Profile          | self allowlist; scoped minimal staff view                       | status/sensitive field change                 | overposted/disallowed field                         |
| 5   | Learning Track        | public published or owner tenant; assigned writer               | publish/archive                               | owner/visibility mismatch                           |
| 6   | Course                | entitled published; assigned author draft                       | publish/supersede                             | incomplete review or tenant mismatch                |
| 7   | Module                | inherit course version                                          | rule/order publication                        | invalid/cross-version structure                     |
| 8   | Lesson                | entitlement + published version                                 | publish and sensitive resource access         | draft/unsanitized/unauthorized source               |
| 9   | Content Versioning    | artifact owner/reviewer separation                              | every state transition/diff hash              | published mutation/conflicting version              |
| 10  | Media / Storage       | parent resource auth before signed grant                        | P3/P4 download/delete/scan block              | scan pending/fail, path/class mismatch              |
| 11  | Progress              | self enrollment; assigned mentor/admin read                     | anomalous/admin correction                    | invalid completion or actor mismatch                |
| 12  | Assessment            | eligible self attempt; assigned author/evaluator                | start/submit/expire/integrity                 | timer/limit/prerequisite/key boundary               |
| 13  | Question Bank         | assigned author/reviewer only; keys service-only                | publish, retire and key access                | learner/client key path                             |
| 14  | Assignment            | owner before submit; evaluator after                            | submit and sensitive download                 | unscanned object/deadline/state                     |
| 15  | Evaluation            | assigned evaluator; learner released projection                 | final/release/override                        | missing rubric/review/assignment                    |
| 16  | Certificate           | holder/scoped credential admin                                  | issue/expire/revoke/renew                     | eligibility/evidence/status conflict                |
| 17  | Verification          | anonymous exact-token projection only                           | abuse/status telemetry                        | token invalid/rate/stale status                     |
| 18  | Gamification          | self ledger; service append                                     | manual reversal/rule change                   | duplicate/unrecognized source                       |
| 19  | Notification          | recipient content; tenant template admin                        | consent unsubscribe, sensitive send           | optional consent absent/purpose invalid             |
| 20  | Discussion            | active space membership/moderator                               | moderation/report                             | membership/content safety failure                   |
| 21  | Announcement          | audience membership; scoped publisher                           | publish/cancel/mandatory ack                  | audience/publish authorization                      |
| 22  | Mentor                | active dated assignment -> cohort members                       | assignment and sensitive view/action          | assignment ended/learner outside cohort             |
| 23  | Cohort                | tenant admin manage; member/mentor scoped read                  | roster changes/import                         | cross-tenant member/course                          |
| 24  | Intervention          | active mentor assignment + learner relation                     | nudge/retake/review/outcome                   | consent/quota/assignment absent                     |
| 25  | Reporting             | named report permission + field allowlist                       | request/download/export                       | unauthorized field/small cell                       |
| 26  | Analytics             | self/assigned/tenant aggregate; no raw client read              | governed export/config                        | tenant/suppression/consent failure                  |
| 27  | Compliance            | explicit compliance case/policy scope                           | all policy/case/hold/retention actions        | purpose/hold/authority missing                      |
| 28  | DPDP Consent          | subject self; compliance safe receipt                           | every lifecycle event                         | notice/purpose/evidence write invalid               |
| 29  | Audit Evidence        | scoped auditor read; controlled insert only                     | self-evidencing plus export custody           | append/hash/authorization failure                   |
| 30  | PII Protection        | row auth + purpose + field policy + consent                     | every reveal/decrypt class requiring evidence | crypto/policy/purpose failure                       |
| 31  | AI Tutor              | self enrollment and authorized source each turn                 | high-risk/safety + usage provenance           | context/consent/budget/safety failure               |
| 32  | AI Mentor             | active mentor assignment and minimized cohort                   | recommendation review/action                  | assignment/source/minimization failure              |
| 33  | AI Assistant          | current user + tool-specific reauthorization                    | proposed/confirmed high-risk tool             | schema/tool/confirmation failure                    |
| 34  | AI Content            | assigned source author/reviewer                                 | provenance, accept/reject/publish             | unauthorized/stale/invalid output                   |
| 35  | AI Evaluation         | evaluator assignment + blind projection                         | model/prompt/proposal/review                  | low confidence/review missing                       |
| 36  | Recommendation        | self/assigned safe features                                     | career model/policy/decision review           | protected feature/insufficient evidence             |
| 37  | Search                | source RLS rechecked for every result                           | candidate/sensitive search abuse              | stale index grants broader visibility               |
| 38  | Translation           | source permission + target reviewer                             | legal/privacy approval                        | unapproved high-risk translation                    |
| 39  | Voice Tutor           | explicit session consent + tutor entitlement                    | session/retention/safety events               | consent/recording indication/provider policy        |
| 40  | Billing               | billing permission within account tenant                        | profile/invoice/catalog change                | tenant/currency/provider mismatch                   |
| 41  | Subscription          | billing read; verified service transitions                      | every lifecycle/entitlement change            | unsigned/client-reported transition                 |
| 42  | Payment               | verified provider webhook/service only                          | immutable normalized transaction              | bad signature/duplicate amount mismatch             |
| 43  | Enterprise Admin      | explicit descendant + permission, aggregate default             | every cross-org command/export                | sibling/raw-PII request                             |
| 44  | Platform Admin        | MFA, step-up, time-bound support/break-glass                    | full reason/approval/session actions          | grant/audit/expiry absent                           |
| 45  | Placement             | candidate/TPO/partner application relationship                  | application/stage outcome                     | party/consent/transition mismatch                   |
| 46  | Internship            | same opportunity/application policy                             | publish/outcome                               | invalid partner/attributes                          |
| 47  | Hiring Partner        | partner own tenant; platform verification                       | verify/suspend/team privilege                 | unverified/suspended partner                        |
| 48  | Candidate Visibility  | candidate consent/grant + verified partner/purpose/field/expiry | request, decision and atomic reveal event     | any check/evidence append failure                   |
| 49  | Developer API         | hashed API key + scope + tenant + RLS                           | key lifecycle and sensitive command           | invalid/revoked/quota/scope                         |
| 50  | Webhook               | verified inbound signature; owner outbound subscription         | secret/config/replay/terminal failure         | bad signature/SSRF/dedupe failure                   |
| 51  | Feature Flag          | platform/tenant flag permission                                 | every rule/rollback                           | rule error uses safe default; never security bypass |
| 52  | Workflow              | initiator auth plus step-time recheck                           | retry/cancel/manual high-risk step            | current permission/consent/idempotency              |
| 53  | Event                 | producer-owned outbox; consumer allowlist                       | schema/replay/poison operations               | invalid schema/privacy/classification               |
| 54  | Integration           | server-only adapter, egress/provider policy                     | credential/config and sensitive failure       | secret/region/DPA/circuit policy                    |
| 55  | Security Monitoring   | security case scope; investigation support grant                | alert/case/containment/access                 | monitoring identity/dual control absent             |

## Threat-Specific Rules

### Cross-Tenant Access

Tests create at least two organizations, enterprise siblings, partner organizations and shared multi-membership users. They prove denial through direct Supabase calls, Server Actions, Route Handlers, Realtime, Storage and exports. Tenant identifiers from URL/body never override resolved scope.

### Assessment Leakage

Answer keys live separately; learner policies cannot select them. Attempt payloads contain frozen question/options only. Build artifacts and logs are searched for keys/correct flags. Tutor/Assistant tool catalogs cannot query protected question data.

### PII Reveal

Partner search uses redacted projection. Actual field reveal is a server function/transaction that validates the current grant and appends immutable evidence before returning allowlisted fields. No bulk endpoint, background prefetch, shared cache or admin override exists.

### AI Prompt Injection And Exfiltration

Retrieved content is delimited as data. Tool calls use typed allowlists and reauthorize. Output schemas and DLP/safety checks run before display/action. System prompts, secrets, other-tenant content and answer keys are unavailable to the model context.

### Provider/Webhook Abuse

Verify raw body, signature and timestamp before parsing. Apply body limit, dedupe provider event ID and protect outbound endpoints against SSRF/private-network targets. Reconciliation fetches provider state when order or authenticity remains uncertain.

### Public And Export Surfaces

Public certificate verification, report downloads, API responses, Realtime payloads and Storage grants use dedicated allowlists. Tokens/URLs are high entropy, short-lived where applicable, excluded/redacted from logs and rate-limited.

## Key Management

- Public Supabase publishable key may reach browsers; service role and provider keys may not.
- Secrets live in approved environment/secret stores and rotate by runbook.
- API/webhook/invitation/access tokens are random, displayed once where required and stored hashed; reversible provider secrets use envelope encryption.
- Cryptographic algorithms, key IDs and rotation status are configuration, never hardcoded domain behavior.

## Release Evidence

No engine is production-ready without threat model, data classification, RLS matrix, negative authorization tests, audit coverage, dependency/secret scan, incident/rollback notes and owner sign-off. High-risk engines additionally require Security and Privacy approval; AI/hiring/payment engines require their domain review gates.
