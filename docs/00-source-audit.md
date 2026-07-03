# Source Audit

## Audit Scope

Audited on 2026-07-03 against the files available to this workspace. This audit distinguishes reviewed evidence from documents named in Prompt #003 but not supplied. Missing documents are not treated as inferred requirements.

## Source Inventory

| Source                                                          | Status                 | Contribution                                                                                                                   | Authority                                                       |
| --------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Prompt #001, master architecture brief                          | Reviewed               | Product scale, approved stack, feature-first architecture, core roles/modules, AI capabilities, security and quality standards | Binding architecture baseline                                   |
| Prompt #002, engineering foundation brief                       | Reviewed               | Repository conventions, environment strategy, CI, security middleware, observability, testing and documentation foundations    | Binding engineering baseline                                    |
| Prompt #003, product/data architecture brief                    | Reviewed               | Required module catalog, roles, data domains, RLS concerns, service boundaries, roadmap and deliverables                       | Binding scope for this documentation set                        |
| `ARCHITECTURE.md` and `docs/architecture.md`                    | Reviewed               | Domain-neutral multi-tenancy, runtime layers, provider isolation, server-side authorization                                    | Current repository contract                                     |
| `README.md`, `ROADMAP.md`, standards and onboarding docs        | Reviewed               | Supported runtime, development workflow, security/performance/accessibility expectations                                       | Current operating baseline                                      |
| `database/migrations/0001_core_learning_platform.sql`           | Reviewed, not modified | Early organizations, learning, assessment, certificate and AI model plus initial RLS intent                                    | Historical scaffold; not the final schema contract              |
| `types/domain.ts`, `features/*`, `services/*`, `lib/supabase/*` | Reviewed               | Existing naming and abstraction direction                                                                                      | Implementation reference only                                   |
| SYRA GRC/DPDP product documents                                 | Not supplied           | Expected regulatory controls and domain workflows                                                                              | Required before DPDP content sign-off                           |
| PRD, BRD and SRS                                                | Not supplied           | Expected business rules, scope and acceptance criteria                                                                         | Required before implementation scope lock                       |
| Wireframes and mentor/student dashboard documents               | Not supplied           | Expected information architecture and interaction requirements                                                                 | Required before experience design                               |
| Legacy ER diagrams and data-flow diagrams                       | Not supplied           | Expected domain entities and integrations                                                                                      | Reference only when supplied; stack assumptions are non-binding |
| QA checklist and sprint backlog                                 | Not supplied           | Expected test scenarios, priorities and delivery constraints                                                                   | Required before release planning                                |
| Hiring-partner architecture reference                           | Not supplied           | Expected candidate discovery, consent and reveal flows                                                                         | Required before placement implementation                        |

## Reusable Product Evidence

- DPDP is a learning track and compliance policy pack, never a platform discriminator.
- Organizations are tenant boundaries; a person may belong to multiple organizations.
- Learning content is track → course → module → lesson, with reusable assessments and certificates.
- Student, mentor, instructor, organization/enterprise/platform administrators, super administrators, hiring partners and placement officers require distinct access scopes.
- Candidate PII reveal requires explicit purpose, consent, authorization and immutable evidence.
- Consent, privacy requests, retention actions, certificate status and administrative actions require durable audit evidence.
- AI is a governed capability layer with multiple providers, purpose-specific engines, safety controls, cost attribution and human review where consequential.
- The platform must support 1,000+ organizations, 100,000+ learners, 10,000+ courses and millions of assessment attempts without changing its tenancy model.

## Rejected Legacy Assumptions

The following are explicitly discarded even if later legacy documents contain them:

- Django, Django REST Framework and Python service boundaries.
- Celery workers or broker-dependent job orchestration.
- Prisma schemas or Prisma migration ownership.
- React/Vite routing and build structure.
- AWS S3 object storage.
- SendGrid email delivery.
- Prototype HTML, inline CSS, mock payloads and hardcoded dashboard state.
- Authorization enforced only in UI or API code.

Approved replacements are Next.js App Router, Supabase Auth/PostgreSQL/Storage/Realtime, narrowly scoped Supabase Edge Functions, Resend, MSG91, Stripe, Razorpay and Vercel.

## Conflicts And Resolutions

| Conflict                                                                                                    | Resolution                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing migration encodes a single enum role per organization member                                       | Blueprint uses membership plus assignable roles/permissions; migration must be superseded or reconciled in Phase 1, never edited after production application       |
| Existing migration stores question choices and answer keys together                                         | Blueprint separates question content, options and protected answer/evaluation data so learners cannot read answer keys through RLS                                  |
| Existing migration stores AI input/output JSON without sensitivity controls                                 | Blueprint separates interaction metadata, encrypted/redacted content and usage records with retention by purpose                                                    |
| Existing certificate record exposes a verification code but no public-safe projection, expiry or revocation | Blueprint adds immutable issuance events and a minimal public verification projection                                                                               |
| Prompt #001 names visual preferences while Prompt #003 forbids UI implementation                            | Preserve design standards; defer screen/component implementation to experience phases                                                                               |
| Platform administrator roles can conflict with compliance log immutability                                  | No interactive role may update or delete compliance-critical evidence; only append-only database functions and controlled retention jobs may write lifecycle events |

## Missing Requirements

Human confirmation is required for:

1. Tenant hierarchy: whether enterprises may contain child organizations and whether data can roll up across them.
2. Data residency countries, cross-border transfer rules and regional Supabase project strategy.
3. Contractual retention periods by customer, artifact and jurisdiction.
4. DPDP consent notice text, lawful-purpose taxonomy, grievance workflow and erasure exceptions.
5. Assessment proctoring level, identity verification and appeal rules.
6. Certificate accreditation, signing authority and renewal requirements.
7. Billing catalog, tax/GST handling, invoicing, refunds and marketplace implications.
8. Minor learners, guardian consent and age-assurance requirements.
9. Hiring-partner eligibility, candidate ranking rules and PII reveal expiry.
10. AI data-use policy, provider regions, model allowlist and human-review thresholds.
11. Accessibility target beyond WCAG 2.2 AA and supported languages/locales.
12. Recovery objectives, legal hold, breach notification and incident escalation SLAs.

## Source Risks

| Risk                                                   | Effect                              | Control                                                                                             |
| ------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| Named legacy documents are absent                      | Domain rules may be incomplete      | Keep affected decisions open and run a traceability review when documents arrive                    |
| Existing migration may be mistaken for approved design | Premature schema lock-in            | Treat `docs/03-database-blueprint.md` as the design authority until Phase 1 migrations are approved |
| Role names vary across prompts and scaffold            | Authorization drift                 | Use the canonical role/scoping model in `docs/04-rls-security-model.md`                             |
| Compliance terms may be interpreted as legal advice    | Incorrect statutory implementation  | Require privacy counsel approval for notices, retention, rights and lawful-purpose rules            |
| Broad AI capability list can outrun governance         | Privacy, accuracy and cost exposure | Gate each engine through the AI risk tier and release criteria                                      |

## Traceability Rule

Every future requirement must record source, owner, affected modules, security classification, acceptance criteria and decision status. Newly supplied legacy documents may refine product behavior but cannot replace the approved technology stack or weaken tenant isolation, RLS, audit immutability or privacy controls.
