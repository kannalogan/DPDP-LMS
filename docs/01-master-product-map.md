# Master Product Map

## Product Definition

SYRA is a multi-tenant, AI-assisted learning and compliance platform. It delivers reusable learning tracks to individuals and organizations, provides governed assessment and credentialing, supports mentor-led intervention, and produces privacy-safe evidence. DPDP is the first track and compliance policy pack, not a separate application or schema branch.

## Product Principles

1. **Tenant first:** every customer-owned record has an organization boundary or an explicit platform-global classification.
2. **Content generic, policy configurable:** tracks describe domains; compliance packs attach jurisdiction-specific controls, notices and evidence requirements.
3. **Authorization at the data boundary:** UI permissions improve experience, but PostgreSQL RLS is authoritative.
4. **Append evidence, do not rewrite history:** consent, certificate, PII reveal, billing webhook and administrative audit events are immutable.
5. **Public views are projections:** public certificate verification never exposes internal learner, enrollment or organization records.
6. **AI is advisory by default:** consequential evaluation, placement and compliance decisions require declared policy and human review.
7. **Providers are replaceable:** email, SMS, payment and model vendors sit behind typed service contracts.

## Actors And Scopes

| Actor                   | Primary scope                   | Permitted outcomes                                                                            |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Guest                   | Public                          | Discover public catalog; verify a certificate using a non-enumerable token                    |
| Student                 | Self + enrolled content         | Learn, attempt assessments, manage notes/bookmarks/consents, view own results and credentials |
| Mentor                  | Assigned cohorts                | Monitor assigned learners, record interventions and reviews, never access unrelated learners  |
| Instructor              | Assigned content                | Author and publish assigned content/assessments subject to approval workflow                  |
| Organization Admin      | One organization                | Manage membership, enrollment, settings and organization reports                              |
| Enterprise Admin        | Enterprise organization tree    | Govern approved child organizations and aggregate privacy-safe reporting                      |
| Platform Admin          | Platform operations             | Operate catalog, support and system configuration through audited workflows                   |
| Super Admin             | Break-glass platform operations | Time-bound elevated operations; no mutation bypass for immutable evidence                     |
| Hiring Partner          | Partner organization            | Discover eligible, consented candidates and request controlled PII reveal                     |
| TPO / Placement Officer | Assigned organization/cohorts   | Manage opportunities, candidate submissions and consent-aware partner workflows               |

## Bounded Contexts

| Context              | Owns                                                                          | Does not own                                            |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Identity & Tenancy   | profiles, organizations, memberships, roles, permissions, invitations         | Authentication credentials in `auth.users`              |
| Learning Catalog     | tracks, courses, modules, lessons, resources, paths, publication              | Learner progress or assessment scoring                  |
| Learning Delivery    | enrollments, lesson progress, notes, bookmarks, playback state                | Catalog authoring                                       |
| Assessment           | banks, questions, forms, attempts, evaluation, rubrics, integrity signals     | Course publication or certificate issuance policy       |
| Credentials          | templates, eligibility, issuance, status events, public verification          | Assessment response details                             |
| Mentoring            | cohorts, assignments, interventions, reviews, at-risk cases                   | General organization membership                         |
| Engagement           | notifications, preferences, discussions, announcements, gamification ledger   | Provider-specific delivery internals                    |
| AI Platform          | engines, prompts/config, interactions, safety decisions, usage/cost           | Canonical learning or assessment records                |
| Career & Hiring      | profiles, opportunities, applications, partner access, PII reveal workflow    | Base identity profile or billing                        |
| Privacy & Compliance | notices, purposes, consent, rights requests, retention, legal holds, evidence | Authentication/session implementation                   |
| Commerce             | plans, prices, subscriptions, invoices, payments, entitlements                | Provider dashboards as source of internal authorization |
| Developer Platform   | API clients/keys, webhook subscriptions/deliveries, integration logs          | Interactive user sessions                               |
| Analytics            | event facts, aggregates and governed exports                                  | Transactional source-of-truth state                     |
| Platform Operations  | feature flags, system config, audit events, incidents                         | Tenant-owned business records                           |

## Core Journeys

### Organization Onboarding

1. Platform creates an organization and owner invitation.
2. Accepted identity creates a profile and organization membership.
3. Organization configures region, branding, privacy contacts and policy pack.
4. Admin assigns scoped roles, imports members and selects subscription entitlements.
5. Every privileged change emits an immutable audit event.

### Learning And Credentialing

1. A published course version is assigned through an enrollment.
2. Learner consumes versioned lessons; progress events update a derived completion snapshot.
3. Assessment form is instantiated from versioned questions without exposing protected answers.
4. Attempt submission is evaluated under the assessment policy and records integrity signals.
5. Eligibility service evaluates completion and score requirements.
6. Credential service issues a certificate snapshot and public-safe verification token.
7. Expiry or revocation appends a status event; historical issuance is retained.

### Mentor Intervention

1. Mentor receives access only through an active cohort assignment.
2. Risk signals identify stalled progress, repeated failure or inactivity.
3. Mentor records an intervention with visibility and sensitivity classification.
4. Learner/cohort outcomes are measured without changing raw learning evidence.

### Candidate PII Reveal

1. Candidate opts into visibility for declared opportunity categories and fields.
2. Hiring partner searches a redacted candidate projection.
3. Partner submits a purpose-bound reveal request.
4. Policy checks partner status, opportunity, candidate consent, field scope and expiry.
5. Approved reveal produces a short-lived access grant and immutable reveal event.
6. Access expiry or consent withdrawal prevents future reads but never deletes the evidence event.

### Privacy Rights

1. Data principal submits or staff records a verifiable request.
2. Compliance triage validates identity, jurisdiction, scope and deadline.
3. Data map discovers affected records and applicable legal/contractual exceptions.
4. Approved actions are executed by controlled jobs with before/after evidence.
5. Response and closure are recorded; legal holds prevent prohibited deletion.

## Domain-Neutral Track Model

- `learning_tracks` classify a domain such as DPDP, GDPR or cybersecurity.
- Versioned courses carry learning outcomes, locale and publication state.
- Compliance packs associate controls, evidence requirements and policy text with a track/version and jurisdiction.
- Organizations activate tracks and optionally deploy private course variants without forking platform behavior.
- Assessments, certificates, mentoring, AI and analytics reference generic course/version identifiers.

## System Of Record

| Information                                                | System of record                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Credentials and sessions                                   | Supabase Auth                                                                         |
| Tenant, learning, assessment, privacy and operational data | Supabase PostgreSQL                                                                   |
| Private learning assets and generated certificates         | Supabase Storage                                                                      |
| Live discussion, notifications and status updates          | Supabase Realtime over authorized tables/channels                                     |
| Payment transaction authority                              | Stripe/Razorpay, reconciled into internal immutable events                            |
| Email/SMS delivery authority                               | Resend/MSG91 delivery events, correlated to internal notifications                    |
| AI output                                                  | Provider response retained only under declared purpose; never automatically canonical |
| Deployment                                                 | Vercel                                                                                |

## Non-Functional Targets

- Scale without tenant-specific schemas: 1,000+ organizations, 100,000+ learners, 10,000+ courses and millions of attempts.
- Availability and recovery targets remain open until business tiering is approved; backups and restore drills are mandatory before launch.
- WCAG 2.2 AA, keyboard operation, reduced motion and locale-ready content are release gates.
- Sensitive reads and writes are attributable by actor, tenant, request and purpose.
- List APIs use cursor pagination; analytics avoid transactional-table scans.
- Long-running provider or batch work is idempotent and asynchronous through database-backed work records plus Edge Functions or provider callbacks, not in request lifetimes.

## Success Measures

- Activation: organizations reaching first published enrollment.
- Learning: active learners, completion time, mastery and retention by course version.
- Quality: question performance, evaluation variance, appeals and certificate revocations.
- Mentoring: intervention response and risk recovery.
- Privacy: consent coverage, rights-request SLA, deletion exceptions and unauthorized reveal count.
- Reliability: availability, webhook replay success, notification delivery and failed background work.
- AI: accepted/helpful output, human override, safety block, latency and cost by engine/tenant.

Metrics must be segmented only where privacy thresholds and tenant isolation permit.
