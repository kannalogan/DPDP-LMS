# Engine Implementation Sequence

## Sequencing Principle

Engine numbers identify the Prompt #004 catalog, not build order. Implementation follows trust and data dependencies. Each wave completes schema/RLS, domain service, event contract, observability and tests before downstream engines depend on it. Parallel work is allowed only after shared contracts are approved.

This sequence refines, not replaces, `docs/07-implementation-roadmap.md`.

## Wave 0 - Architecture And Runtime Gate

No product engine implementation starts until Node 22 CI/build passes, environments are configured, existing migration disposition is recorded, Supabase project/residency is decided and the event/workflow schema ADRs are approved.

**Deliverables:** ADR for reset vs forward reconciliation; generated DB types strategy; RLS test harness; provider secret boundaries; event envelope/outbox ADR; workflow state ADR; SLO owners.

## Wave 1 - Trust Foundation

| Order | Engine                  | Prerequisites              | Minimum usable outcome                                | Gate                            |
| ----- | ----------------------- | -------------------------- | ----------------------------------------------------- | ------------------------------- |
| 1     | 3 Organization / Tenant | Wave 0                     | tenant lifecycle/resolution and indexed isolation key | hierarchy/residency ADR         |
| 2     | 1 Identity              | tenant contract            | Supabase Auth session/profile link                    | auth abuse/session tests        |
| 3     | 4 User Profile          | Identity                   | self profile/preferences                              | overposting/privacy tests       |
| 4     | 2 Authorization         | Identity + Organization    | scoped permission/grant model                         | complete role/RLS matrix        |
| 5     | 30 PII Protection       | purpose/classification ADR | encryption/redaction/safe projection contracts        | key management/security review  |
| 6     | 29 Audit Evidence       | actor/tenant context       | immutable append/search skeleton                      | no-update/delete and hash tests |

**Exit:** two-tenant direct-database tests pass; no browser/service-role path; every subsequent command can resolve actor, tenant, permission, purpose and correlation.

## Wave 2 - Coordination And Operations

| Order | Engine                 | Prerequisites                           | Minimum usable outcome                             | Gate                                  |
| ----- | ---------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| 7     | 53 Event               | Audit/context                           | transactional outbox, schema registry, checkpoints | crash/replay/order tests              |
| 8     | 52 Workflow            | Event + idempotency                     | durable job/step/retry/operator contract           | lease/compensation tests              |
| 9     | 54 Integration         | PII + observability                     | typed provider adapters/errors/circuits            | secret/egress/provider contract tests |
| 10    | 51 Feature Flag        | Authorization + Audit                   | safe server evaluation and rollback                | cannot bypass security/entitlement    |
| 11    | 55 Security Monitoring | Audit + Event + Notification interface  | alert/rule/case foundation                         | incident/false-positive exercise      |
| 12    | 19 Notification        | Integration + Event + Consent interface | in-app/Resend/MSG91 intent/delivery/preferences    | consent/unsubscribe/provider tests    |

**Exit:** asynchronous effects survive retries without duplicate business effects; provider degradation is visible; security/notification operations are auditable.

## Wave 3 - Generic Learning Catalog

| Order | Engine               | Prerequisites               | Minimum usable outcome                  | Gate                          |
| ----- | -------------------- | --------------------------- | --------------------------------------- | ----------------------------- |
| 13    | 9 Content Versioning | Authorization + Audit       | generic draft/review/publish transition | immutable publication tests   |
| 14    | 5 Learning Track     | Versioning                  | global/private track catalog            | proves DPDP is data, not code |
| 15    | 6 Course             | Track + Versioning          | course/version publication              | author/reviewer RLS           |
| 16    | 7 Module             | Course                      | ordered structure and completion policy | self-paced/no date gate       |
| 17    | 10 Media / Storage   | PII + Integration           | private object/external-media grants    | Storage RLS/scan/signed URL   |
| 18    | 8 Lesson             | Module + Media + Versioning | versioned lesson delivery               | sanitization/entitlement      |
| 19    | 37 Search            | Event + published catalog   | tenant-safe catalog index/search        | source RLS recheck            |

**Exit:** an authorized author can publish a domain-neutral course version and an entitled learner can read safe content. No enrollment/progress yet.

## Wave 4 - Learning Delivery And Human Grouping

| Order | Engine                    | Prerequisites                   | Minimum usable outcome                         | Gate                       |
| ----- | ------------------------- | ------------------------------- | ---------------------------------------------- | -------------------------- |
| 20    | 23 Cohort                 | Organization + Authorization    | tenant roster and bulk-safe grouping           | cross-tenant roster tests  |
| 21    | 22 Mentor                 | Cohort + Authorization          | dated mentor assignment/read scope             | assignment expiry RLS      |
| 22    | 11 Progress               | Catalog + Event                 | enrollment/activity/progress/unlock projection | replay/offline/scale tests |
| 23    | 21 Announcement           | Cohort + Notification           | targeted publish/acknowledgement               | audience RLS               |
| 24    | 20 Discussion / Community | Enrollment + Cohort + Realtime  | course/cohort forum and moderation             | XSS/abuse/RLS              |
| 25    | 24 Intervention           | Mentor + Notification + Consent | reasoned nudge/review/follow-up                | consent/quota/assignment   |

**Exit:** student and mentor core journeys work through engines and RLS; no page implementation may invent additional learner authority.

## Wave 5 - Assessment And Credentials

| Order | Engine                      | Prerequisites                       | Minimum usable outcome                    | Gate                               |
| ----- | --------------------------- | ----------------------------------- | ----------------------------------------- | ---------------------------------- |
| 26    | 13 Question Bank            | Versioning + Authorization          | protected versioned questions/keys        | zero key leakage                   |
| 27    | 12 Assessment               | Question Bank + Progress + Workflow | quiz/exam form and attempt lifecycle      | timer/limit/submit race tests      |
| 28    | 14 Assignment               | Assessment + Media                  | open-ended submission freeze              | artifact/privacy tests             |
| 29    | 15 Evaluation               | Assessment + Assignment             | deterministic/human rubric result/release | evaluator RLS/override evidence    |
| 30    | 18 Gamification             | Event + Progress + Evaluation       | append/reversal points/badges             | rule/idempotency/opt-in            |
| 31    | 16 Certificate              | Progress + Evaluation + Media       | idempotent issue/status/artifact          | eligibility/status evidence        |
| 32    | 17 Certificate Verification | Certificate + rate limit            | public-safe exact-token verification      | enumeration/revocation cache tests |

**Exit:** a learner can complete generic learning, pass a reusable assessment and receive a verifiable credential without DPDP-specific code.

## Wave 6 - Compliance And Evidence Operations

| Order | Engine          | Prerequisites                     | Minimum usable outcome                    | Gate                                   |
| ----- | --------------- | --------------------------------- | ----------------------------------------- | -------------------------------------- |
| 33    | 27 Compliance   | Identity + PII + Audit + Workflow | purposes/notices/requests/retention/holds | counsel policy decisions               |
| 34    | 28 DPDP Consent | Compliance + Identity             | purpose/version-bound consent lifecycle   | notice/withdrawal/minor policy         |
| 35    | 26 Analytics    | Event + PII + Consent             | pseudonymous events/facts/suppression     | reconciliation/re-identification tests |
| 36    | 25 Reporting    | Analytics + Workflow + Media      | governed async reports/exports            | field/small-cell/download audit        |

**Exit:** rights and retention workflows, policy-driven DPDP operation, audit review and privacy-safe metrics are demonstrable. DPDP course content can be loaded as data after SME approval.

## Wave 7 - Administration And Commerce

| Order | Engine              | Prerequisites                                | Minimum usable outcome                      | Gate                               |
| ----- | ------------------- | -------------------------------------------- | ------------------------------------------- | ---------------------------------- |
| 37    | 44 Platform Admin   | Authorization + Audit + Security Monitoring  | config/support/break-glass orchestration    | step-up/dual control/no PII bypass |
| 38    | 40 Billing          | Organization + Integration + PII             | billing account/catalog/invoice projection  | tax/catalog ADR                    |
| 39    | 42 Payment          | Billing + Webhook interface                  | signed Stripe/Razorpay event reconciliation | provider fixture/replay tests      |
| 40    | 41 Subscription     | Billing + Payment + Event                    | normalized lifecycle/entitlements           | state/order/grace policy           |
| 41    | 43 Enterprise Admin | hierarchy + Reporting + Subscription         | approved child-org governance/rollups       | enterprise hierarchy/sibling tests |
| 42    | 49 Developer API    | Authorization + rate/idempotency + contracts | scoped keys and `/api/v1` foundation        | OpenAPI/security/load review       |
| 43    | 50 Webhook          | Event + Integration + Developer API          | signed subscriptions/delivery/replay        | SSRF/signature/secret tests        |

**Exit:** commercial entitlements and enterprise/developer operations are provider-neutral and do not create administrative data bypasses.

## Wave 8 - Low/Medium-Risk AI

| Order | Engine                   | Prerequisites                           | Minimum usable outcome                         | Gate                                |
| ----- | ------------------------ | --------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| 44    | 34 AI Content Generation | AI provider/policy + Versioning/Search  | draft summaries/flashcards/questions           | benchmark, citations, human publish |
| 45    | 38 Translation           | AI Content + locale/versioning          | reviewed localized drafts                      | qualified review for legal content  |
| 46    | 31 AI Tutor              | Search + Progress + Consent + streaming | cited enrolled-content tutor                   | injection/leakage/latency/cost      |
| 47    | 33 AI Assistant          | Authorization + tool contracts          | safe navigation/read-only then confirmed tools | tool reauth/confirmation            |
| 48    | 36 Recommendation        | Analytics + Progress + Search           | explainable learning recommendations           | evidence/bias/privacy thresholds    |

**Exit:** AI provider/config/prompt/content/usage/safety records are operational; every output is attributable, bounded and reversible/advisory.

## Wave 9 - High-Risk AI

| Order | Engine           | Prerequisites                        | Minimum usable outcome                | Gate                                  |
| ----- | ---------------- | ------------------------------------ | ------------------------------------- | ------------------------------------- |
| 49    | 32 AI Mentor     | Mentor + Analytics + Recommendation  | assigned-cohort recommendation drafts | fairness/human-action review          |
| 50    | 35 AI Evaluation | Evaluation + calibrated benchmark    | criterion-level proposal only         | human agreement/appeal/model rollback |
| 51    | 39 Voice Tutor   | AI Tutor + approved speech providers | consented ephemeral voice session     | privacy/region/captions/accessibility |

**Exit:** high-risk model behavior has independent benchmark ownership, human-review operations, rollback and Privacy/Security approval. Engines remain disabled by default until gates pass.

## Wave 10 - Career And Hiring

| Order | Engine                  | Prerequisites                                        | Minimum usable outcome                  | Gate                                   |
| ----- | ----------------------- | ---------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| 52    | 47 Hiring Partner       | Organization + Authorization + Subscription          | verified partner tenant/profile         | verification policy and abuse controls |
| 53    | 48 Candidate Visibility | Consent + PII + Audit + Search + partner/opportunity | redacted discovery and atomic reveal    | dedicated threat model/legal approval  |
| 54    | 45 Placement            | Candidate Visibility + Workflow + Notification       | drives/applications/stage timeline      | protected-trait/fairness/party RLS     |
| 55    | 46 Internship           | Placement + common opportunity model                 | internship-specific attributes/outcomes | no parallel schema drift               |

**Exit:** the D-EMP reveal invariant is preserved under Supabase RLS: verified partner, candidate opt-in, anonymized discovery, explicit purpose/field request, expiring grant and immutable access evidence with no admin/bulk/prefetch path.

## Highest-Risk Engines

1. Candidate Visibility: irreversible PII disclosure and employment context.
2. Authorization and Organization: one defect compromises every tenant boundary.
3. Assessment/Question Bank/Evaluation: answer integrity and consequential scoring.
4. Compliance/Consent/PII/Audit: statutory rights and evidence immutability.
5. Payment/Subscription: financial integrity and entitlement ordering.
6. AI Evaluation/Mentor/Recommendation/Voice: privacy, bias and human-impact risk.
7. Platform Admin/Workflow/Event: privileged or cross-engine blast radius.

## Parallelization Rules

- UI shells may prototype against typed schemas only after engine contracts are approved; they cannot create fake production data paths.
- Provider adapters can be built in parallel with domain engines behind contract fixtures.
- Database/RLS and feature service work proceed together; RLS is not postponed to integration.
- AI benchmark development starts before AI implementation and uses approved, de-identified fixtures.
- Career work does not start before consent/PII/audit engines and hiring legal decisions.

## Prompt 5 Readiness Gate

Prompt 5 may begin Phase 0/1 implementation only after humans decide:

- existing migration reset versus forward reconciliation;
- Supabase region/data residency and enterprise hierarchy;
- event outbox/workflow tables and retention;
- canonical role/permission seed ownership;
- minor-user default (current safe default: prohibited);
- initial provider/environment ownership and secrets;
- whether Prompt 5 implements the complete Wave 1 schema or a smaller trust-foundation slice.

Recommended Prompt 5 title: **SYRA Phase 0/1 - Supabase Trust Foundation, Migration Reconciliation And RLS Verification**.
