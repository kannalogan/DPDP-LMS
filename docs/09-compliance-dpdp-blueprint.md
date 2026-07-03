# DPDP Compliance Blueprint

## Scope

This blueprint translates DPDP product requirements into platform controls. It is an engineering design, not legal advice. Indian privacy counsel must approve statutory interpretation, notice language, consent basis, exemptions, retention and grievance/notification procedures before production.

DPDP has two distinct roles in SYRA:

1. **Learning track:** versioned DPDP courses, assessments and credentials use the generic learning engine.
2. **Platform compliance pack:** configurable notices, purposes, rights, retention and evidence govern SYRA’s own processing and tenant processing where contractually applicable.

No DPDP-specific column is added to generic course, assessment or certificate tables.

## Data Fiduciary Boundaries

Before implementation, contracts must identify for each processing purpose whether SYRA or the customer organization is Data Fiduciary, Data Processor, joint/independent fiduciary, and who handles requests/incidents. The organization’s privacy contact, policy pack and jurisdiction drive case routing. Provider subprocessors are recorded separately with purpose, data category, region and contract status.

## Data Inventory

| Category          | Examples                                       | Classification | Default purpose                         |
| ----------------- | ---------------------------------------------- | -------------- | --------------------------------------- |
| Identity/contact  | name, email, phone, locale                     | P2/P3          | account and service delivery            |
| Organization      | employer, membership, role                     | P2             | tenant administration                   |
| Learning behavior | enrollment, playback, progress, notes          | P3             | learning delivery and support           |
| Assessment        | responses, scores, integrity signals           | P3             | evaluation and credential eligibility   |
| Credentials       | holder display name, achievement, status       | P2             | issuance and opted public verification  |
| Career            | resume, education, experience, application     | P3             | career services                         |
| PII reveal        | requested/revealed fields, partner and purpose | P3/P4 evidence | consented hiring workflow               |
| AI                | prompts, outputs, retrieved context, usage     | P2/P3          | declared engine purpose                 |
| Commerce          | billing contact, tax/invoice records           | P3/P4          | contract/payment/legal obligation       |
| Security          | IP/user-agent hashes, audit events             | P3/P4          | security, fraud and compliance evidence |

The production data map must list every field, source, purpose, basis, owner, recipients, storage region, encryption, retention and rights behavior.

## Notice And Consent Lifecycle

1. Resolve tenant, audience, locale, jurisdiction and processing purpose.
2. Present the active immutable `privacy_notice_version` before consent where consent is required.
3. Record affirmative action, notice hash/version, purpose, context, timestamp and privacy-preserving evidence.
4. Maintain current state in `consent_records`; append every grant, renewal, expiry and withdrawal to `consent_events`.
5. Make withdrawal as accessible as grant and apply it prospectively without erasing historical proof.
6. Do not bundle optional AI, marketing, public credential or hiring visibility consent with service-essential processing.
7. Re-consent when purpose or material notice terms change; a new text version alone does not silently expand consent.

## Purpose Limitation

Every sensitive command declares a `processing_purpose`. A policy matrix maps purpose to permitted data categories, roles, providers, retention and legal/consent basis. Examples:

| Purpose                 | Allowed data                                   | Forbidden reuse                          |
| ----------------------- | ---------------------------------------------- | ---------------------------------------- |
| Learning delivery       | identity, enrollment, progress, submitted work | hiring visibility or marketing           |
| Mentor support          | assigned learner progress/risk factors         | unrelated cohorts or career screening    |
| Credential verification | issuance snapshot and status                   | account/contact details                  |
| AI tutor                | authorized course context and learner query    | provider training or employment decision |
| Career matching         | opted career profile and credentials           | reveal of contact/identity without grant |
| Security/fraud          | session and integrity evidence                 | learner ranking or marketing             |

Authorization fails when purpose is absent, inactive or incompatible, even if the actor has a broad administrative role.

## Data Principal Rights Workflow

| Stage          | Required control                                                           | Evidence                                               |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| Intake         | Accessible authenticated and assisted channels; case number                | request record                                         |
| Verification   | Proportionate identity checks; avoid collecting excessive ID               | verification event, not unnecessary document retention |
| Triage         | Jurisdiction, request type, controller role, deadline and scope            | assignment/decision event                              |
| Discovery      | Search profile, learning, assessment, AI, career, provider and backup maps | data manifest                                          |
| Review         | Apply documented exceptions, third-party rights and legal holds            | reasoned decision                                      |
| Execution      | Export/correct/erase/anonymize through idempotent jobs                     | per-system action/evidence hash                        |
| Response       | Secure delivery and understandable explanation                             | communication event                                    |
| Closure/appeal | Record completion, grievance and escalation route                          | immutable timeline                                     |

Supported case types include access/information, correction, completion, erasure, consent withdrawal, grievance and nomination when approved by counsel. SLA clocks and escalation rules are configuration, not hardcoded constants.

## Retention And Deletion

- Policies are versioned by data category, purpose, tenant and jurisdiction.
- A scheduled scanner identifies due records; it does not delete directly.
- Execution checks legal hold, open dispute, certificate/audit/tax requirements and referential effects.
- Action may delete, redact, anonymize, cryptographically erase or retain under documented exception.
- Backups follow an expiry schedule and are not selectively edited; restored data must reapply completed deletion manifests before service restoration.
- Execution records contain hashes/references, not erased content.

## Hiring Partner PII Reveal

1. Candidate independently enables discoverability and chooses field categories, partner/opportunity scope and expiry.
2. Partners search only a redacted projection.
3. Reveal request declares purpose, opportunity and fields.
4. Policy validates verified partner, active user, approved opportunity, candidate grant/consent and field minimization.
5. Approval creates an expiring field-scoped grant.
6. Reveal and evidence append occur atomically; failure to record evidence prevents disclosure.
7. Candidate can view reveal history and withdraw future access.
8. Partners cannot export or reuse data beyond purpose/expiry; contractual and technical controls reinforce this.

## Children And Guardians

The platform must not infer that all learners are adults. Before serving minors, human owners must approve age-assurance thresholds, verifiable parental consent, guardian identity, child-safe notices, communication restrictions, AI safeguards and deletion handling. Until then, tenant onboarding must prohibit minor enrollment or place the capability behind a disabled policy gate.

## Security Controls

- TLS in transit; Supabase/provider encryption at rest; application-level encryption for selected P3/P4 fields.
- Least privilege RLS plus field-safe projections; no administrator blanket access.
- MFA and short-lived elevation for privileged roles; break-glass sessions require reason and dual approval.
- Signed URLs with short expiry for private objects; malware/type/size checks before publication.
- Hash API/webhook tokens and privacy-preserving network identifiers; never store raw payment card data.
- Immutable audit, consent, PII reveal, retention and certificate status events.
- Security incident runbook with containment, evidence preservation, fiduciary/customer routing and counsel-approved notification timelines.

## Audit Evidence

Evidence must answer who acted, under which tenant/role/purpose, on what resource, when, from which request/correlation, with what outcome and policy version. Evidence exports include query scope, generation identity/time, object hash, custody events and expiry. Hash chaining helps detect tampering but does not replace access control, backup integrity or external anchoring review.

## DPDP Learning Track Model

DPDP content is represented as:

- one or more `learning_tracks` for approved DPDP curricula;
- versioned courses/modules/lessons and resources;
- a compliance pack relating learning outcomes to DPDP control identifiers/evidence requirements;
- generic quizzes/exams/assignments and certificate policies;
- organization assignments and reports using generic enrollment/progress models.

Control taxonomy, statutory references, effective dates and jurisdiction are content/configuration. A law change creates a new content/compliance-pack version and impact analysis; it does not trigger a platform fork.

## Reports

Compliance reporting includes notice/consent coverage, consent withdrawal, rights-request aging/SLA, retention due/executed/exceptions, privileged/sensitive access, PII reveal activity, provider/subprocessor inventory, policy versions, incident status and employee DPDP training completion. Reports apply tenant scope, minimum necessary fields, cell suppression and audited export expiry.

## Launch Gates

- Counsel-approved fiduciary/processor role matrix and notices.
- Complete data inventory, subprocessor register and cross-border/residency decision.
- Verified rights-request and retention runbooks, including backup restore behavior.
- RLS and immutable-log tests across two tenants and all roles.
- PII reveal threat model and candidate consent usability review.
- Incident response exercise and evidence-export validation.
- Minor-user policy decided and enforced.
- DPDP course content reviewed by qualified subject-matter experts.

## Evidence Still Required

The named GRC/DPDP documents were not supplied to this workspace. Their control wording, workflows and evidence expectations require a traceability review against this blueprint before Phase 4. Architectural constraints remain binding; product details may be refined through recorded decisions.
