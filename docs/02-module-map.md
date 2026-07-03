# Module Map

## Module Contract

Each module owns its domain rules, server operations, validation schemas and tests under `features/<module>`. It may read another module through an exported query/service contract and react to durable events; it must not import another module's internal repository or mutate its tables directly.

## Core Platform

| Module         | Responsibilities                                                        | Depends on                   | Emits                                  |
| -------------- | ----------------------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| Authentication | Supabase Auth session integration, identity linking, MFA/session policy | Supabase Auth, Profiles      | identity linked, session risk detected |
| User Profiles  | Application identity, locale, timezone, accessibility preferences       | Authentication               | profile updated                        |
| Organizations  | Tenant lifecycle, hierarchy, branding and privacy contacts              | Profiles, Audit              | organization created/changed           |
| Tenants        | Tenant resolution and request context; organizations are tenant records | Organizations                | tenant context resolved                |
| RBAC           | Scoped roles, permissions, assignments and authorization helpers        | Organizations, Profiles      | role assignment changed                |
| Settings       | User/organization configuration with typed keys and ownership           | Profiles, Organizations      | setting changed                        |
| Notifications  | In-app/email/SMS intent, preferences, templates and delivery state      | Resend, MSG91                | notification queued/delivered/failed   |
| Announcements  | Versioned organization/course/cohort broadcasts and acknowledgement     | Notifications, Learning      | announcement published/acknowledged    |
| Audit Logs     | Append-only actor/action/resource/purpose evidence                      | Every privileged module      | audit event appended                   |
| Feature Flags  | Platform/tenant rollout rules and evaluation                            | Organizations, System Config | flag changed                           |
| System Config  | Versioned, audited operational configuration                            | Audit Logs                   | config version activated               |

## Learning

| Module            | Responsibilities                                                            | Depends on               | Emits                              |
| ----------------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------- |
| Tracks            | Domain catalog and compliance-pack association                              | System Config            | track published                    |
| Courses           | Course metadata, outcomes, versioning and publication                       | Tracks, Organizations    | course version published           |
| Modules           | Ordered course structure within a version                                   | Courses                  | structure changed                  |
| Lessons           | Versioned lesson content and completion rules                               | Modules, Resources       | lesson published                   |
| Resources         | Metadata and signed access to Storage assets                                | Supabase Storage         | resource version available         |
| Video Learning    | Playback authorization, progress checkpoints, caption/transcript references | Lessons, Resources       | playback progress recorded         |
| Learning Paths    | Ordered/prerequisite course programs                                        | Courses                  | path published                     |
| Progress Tracking | Enrollment and lesson/course completion projections                         | Courses, Assessments     | progress changed, course completed |
| Notes             | Learner-private or explicitly shared annotations                            | Lessons, Profiles        | note changed                       |
| Bookmarks         | Learner-owned saved lesson/resource positions                               | Lessons                  | bookmark changed                   |
| Search            | Tenant-safe indexed discovery over published catalog/content                | Tracks, Courses, Lessons | search telemetry recorded          |

## Assessment

| Module                | Responsibilities                                                        | Depends on                     | Emits                           |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| Question Bank         | Versioned questions, options, tags and protected keys                   | Organizations, Courses         | question version approved       |
| Quizzes               | Low-stakes assessment policies and forms                                | Question Bank                  | quiz published                  |
| Exams                 | Timed/high-stakes policies, scheduling and integrity requirements       | Question Bank                  | exam scheduled                  |
| Assignments           | Submission briefs, artifacts and evaluator allocation                   | Courses, Resources             | assignment submitted            |
| Attempts              | Immutable attempt lifecycle and response capture                        | Assessments, Authentication    | attempt started/submitted       |
| Evaluation            | Deterministic and human/AI-assisted scoring                             | Attempts, Rubrics, AI Platform | evaluation completed/overridden |
| Retakes               | Eligibility, cooldown, limits and form regeneration                     | Evaluation                     | retake granted/consumed         |
| Rubrics               | Versioned criteria, levels and weighting                                | Courses                        | rubric version published        |
| Anti-cheat Foundation | Integrity events, declarations and review cases; no covert surveillance | Attempts, Audit                | integrity signal/case raised    |
| Result Analytics      | Item analysis, mastery and assessment quality aggregates                | Evaluation, Analytics          | assessment aggregate refreshed  |

## Certificates

| Module                  | Responsibilities                                                 | Depends on                    | Emits                         |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| Templates               | Versioned credential layout and signing metadata                 | Organizations, Tracks         | template published            |
| Issuance                | Eligibility check, immutable snapshot and generated artifact     | Progress, Evaluation, Storage | certificate issued            |
| Verification            | Non-enumerable public-safe projection                            | Issuance                      | verification viewed           |
| Expiry                  | Validity policy and scheduled status transition                  | Issuance                      | certificate expired           |
| Revocation              | Authorized reasoned revocation and evidence                      | Audit                         | certificate revoked           |
| Public Certificate Page | Minimal status/achievement projection, no learner account access | Verification                  | public verification requested |

## AI Engines

All engines use the shared AI gateway, policy, consent, redaction, prompt/version, usage and evaluation modules defined in `docs/08-ai-engine-blueprint.md`.

| Engine                 | Input boundary                                 | Output status                                               |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| AI Tutor               | Authorized course context and learner question | Advisory response with citations                            |
| AI Mentor              | Cohort-authorized progress/risk summary        | Mentor recommendation; never automatic action               |
| AI Assistant           | User-authorized platform context               | Advisory navigation/product help                            |
| Quiz Generator         | Approved course content                        | Draft questions requiring instructor approval               |
| Flashcard Generator    | Approved lesson version                        | Draft learner study aid                                     |
| Course Summarizer      | Approved content/version                       | Version-bound summary                                       |
| Assignment Evaluator   | Submission, rubric and policy                  | Proposed score/feedback requiring configured review         |
| Weak Area Detector     | Mastery aggregates                             | Explainable learner recommendation                          |
| Study Plan Generator   | Goals, availability and progress               | Editable plan                                               |
| Interview Practice     | Chosen role and consented profile context      | Practice transcript and feedback                            |
| Resume Review          | Explicitly uploaded resume                     | Advisory review; short retention                            |
| Career Recommendation  | Consented career profile and outcomes          | Explainable recommendations, not eligibility decision       |
| Translation Engine     | Approved content                               | Draft localized version requiring review before publication |
| Voice Tutor Foundation | Explicit audio session and consent             | Ephemeral transcription/response by default                 |

## Mentor And Student

| Module             | Responsibilities                                             | Key access boundary                      |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------- |
| Mentor Dashboard   | Assigned-cohort aggregates and action queue                  | Active mentor assignment only            |
| Learner Monitoring | Progress, attempts and engagement permitted by cohort policy | No unrelated learner access              |
| Cohort Management  | Cohorts, membership and mentor assignment                    | Organization-scoped administrators       |
| Interventions      | Reasoned outreach/action records                             | Assigned mentor + visibility policy      |
| Reviews            | Scheduled learner reviews and outcomes                       | Assigned mentor/learner/admin scopes     |
| Reports            | Cohort-safe exports and aggregates                           | Minimum-cell privacy thresholds          |
| Alerts             | Rules and acknowledgements for risk signals                  | Assigned responders                      |
| Activity Timeline  | Authorized event projection                                  | Filters sensitive/private event types    |
| At-risk Detection  | Explainable rules/model signals and review status            | Human review before consequential action |
| Student Dashboard  | Personal learning projection                                 | Self only                                |
| Course Player      | Authorized versioned lesson delivery                         | Active enrollment/entitlement            |
| Progress View      | Personal mastery/completion                                  | Self; mentor through assignment          |
| Gamification       | Rules, ledger and derived balances                           | Tenant-configured, no mutable balances   |
| Discussion Forum   | Course/cohort threads, moderation and reports                | Enrollment/cohort visibility             |

## Administration And Enterprise

| Module                   | Responsibilities                                                  | Scope                              |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------- |
| Platform Admin           | Catalog and operations workflows                                  | Platform, audited                  |
| Enterprise Admin         | Child-organization governance and approved rollups                | Enterprise tree                    |
| Organization Admin       | Members, cohorts, enrollment, policy and reports                  | One organization                   |
| Course Admin             | Course ownership, review and publication                          | Assigned catalog scope             |
| Content Admin            | Content/resource moderation and localization                      | Assigned content scope             |
| Mentor Admin             | Mentor eligibility, assignment and workload                       | Organization/cohort scope          |
| Compliance Admin         | Notices, purposes, requests, retention and evidence exports       | Organization + explicit permission |
| Team Management          | Groups and membership                                             | Organization                       |
| Bulk Enrollment          | Validated import, dry run, idempotent execution and result report | Organization                       |
| Reporting                | Governed organization/enterprise exports                          | Scoped aggregates                  |
| Billing & Subscription   | Entitlements, seats, invoices and payment reconciliation          | Billing account                    |
| Custom Course Deployment | Private catalog and assignments                                   | Organization                       |
| White-label Readiness    | Brand/domain/email theme configuration                            | Organization; no code fork         |

## Career And Hiring

| Module               | Responsibilities                                                 | Critical control                      |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Internships          | Opportunity lifecycle and eligibility                            | Organization/partner ownership        |
| Placement            | Drives, submissions, stages and outcomes                         | TPO/admin scope                       |
| Mock Interviews      | Scheduling, practice artifacts and feedback                      | Participant consent                   |
| Hiring Partners      | Verified partner organization and users                          | Platform approval and audit           |
| Candidate Visibility | Redacted searchable profile and opt-in rules                     | Candidate-controlled field scope      |
| PII Reveal Consent   | Purpose/field/partner/opportunity-bound authorization            | Explicit, revocable, expiring consent |
| Reveal Audit Trail   | Append-only request, decision, grant, access and expiry evidence | No interactive update/delete          |

## Compliance

| Module                | Responsibilities                                                      | Evidence                                  |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| DPDP Consent          | Versioned notices, purposes and consent receipts                      | immutable receipt + lifecycle events      |
| Data Principal Rights | Access/correction/erasure/grievance/nomination workflow               | request, verification, decisions, actions |
| PII Protection        | Classification, field policy, encryption/redaction and access purpose | sensitive-access event                    |
| Retention             | Policy schedules and due-item discovery                               | execution event                           |
| Deletion Requests     | Scoped erasure/anonymization with exception/legal hold                | action manifest                           |
| Purpose Limitation    | Allowed processing purpose and data-category matrix                   | authorization decision                    |
| Audit Evidence        | Tamper-evident evidence exports and custody metadata                  | append-only evidence                      |
| Privacy Requests      | Intake, identity verification, SLA and communication                  | case timeline                             |
| Compliance Reports    | Policy status, request SLA, consent and access reporting              | generated report manifest                 |

## Developer Platform

| Module           | Responsibilities                                    | Security boundary                                |
| ---------------- | --------------------------------------------------- | ------------------------------------------------ |
| Developer API    | Versioned tenant API and documented contracts       | API client scope + RLS                           |
| Webhooks         | Signed event subscriptions, delivery and replay     | Per-subscription secrets                         |
| API Keys         | Hashed credentials, scopes, rotation and revocation | Secret shown once                                |
| Rate Limits      | Tenant/client/route quotas and abuse controls       | Fail closed for protected operations             |
| Integration Logs | Redacted request outcome and correlation metadata   | Never store credentials or unrestricted payloads |

## Cross-Module Event Vocabulary

Canonical event names use past tense and versioned payloads, for example `course.version_published.v1`, `enrollment.created.v1`, `assessment.attempt_submitted.v1`, `certificate.issued.v1`, `privacy.consent_withdrawn.v1`, `career.pii_revealed.v1` and `billing.subscription_changed.v1`. Events carry event ID, occurred time, tenant ID, actor, correlation/causation IDs and schema version. They are durable facts, not an authorization mechanism.
