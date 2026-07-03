# Open Risks And Decisions

## Decision Authority

Architecture decisions use an ADR before implementation when they affect tenancy, identity, schema ownership, public contracts, compliance, provider choice or irreversible data. Product owns behavior/scope; Architecture owns boundaries; Security/Privacy own control acceptance; Legal owns statutory/contractual interpretation; Finance owns commerce/tax; Operations owns SLO/DR.

## Accepted Decisions

| ID      | Decision                                                                                                  | Rationale                                               |
| ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| ADR-001 | Approved stack is Next.js 15/React 19/TypeScript/Tailwind v4/shadcn, Supabase, Vercel and named providers | Binding Prompt #001/#003 contract                       |
| ADR-002 | Organization is the tenant boundary; tenant-owned rows carry `organization_id`                            | Consistent RLS, partitioning and ownership              |
| ADR-003 | DPDP is generic track content plus a configurable compliance pack                                         | Enables future domains without forks                    |
| ADR-004 | Supabase Auth credentials and application profiles remain separate                                        | Avoid duplicating identity authority                    |
| ADR-005 | RBAC uses assignable roles/permissions/scopes, not one enum role                                          | Supports multi-role and resource-scoped authority       |
| ADR-006 | Published content, questions, rubrics and templates are immutable versions                                | Reproducible learning/evaluation/credentials            |
| ADR-007 | Audit, consent, PII reveal and status histories are append-only with no human-admin bypass                | Compliance evidence must survive privilege boundaries   |
| ADR-008 | Public certificate verification uses a minimal projection and high-entropy exact token                    | Prevents account/tenant exposure and enumeration        |
| ADR-009 | Provider integrations use typed internal contracts                                                        | Avoids business-domain coupling to vendor SDKs          |
| ADR-010 | AI outputs are advisory/draft unless an approved human-review policy says otherwise                       | Controls accuracy, fairness and consequential decisions |

## Decisions Required Before Their Phase

| ID    | Decision and options                                                                        | Owner                       | Deadline | Blocking impact                              |
| ----- | ------------------------------------------------------------------------------------------- | --------------------------- | -------- | -------------------------------------------- |
| D-001 | Existing `0001` migration: reset before shared use, or forward-reconcile if already applied | Data/Architecture           | Phase 0  | Blocks final migration sequence              |
| D-002 | Enterprise hierarchy: single parent tree, multiple affiliation graph, or no rollup          | Product/Architecture        | Phase 1  | Organization schema and Enterprise Admin RLS |
| D-003 | Supabase regional strategy and data-residency countries                                     | Legal/Security/Ops          | Phase 1  | Project topology, transfers and DR           |
| D-004 | SSO/SAML/SCIM and domain-claim requirements                                                 | Enterprise Product/Security | Phase 2  | Identity and provisioning contracts          |
| D-005 | Minor enrollment allowed; age threshold and guardian flow                                   | Legal/Product               | Phase 2  | Auth/profile/consent; default is prohibited  |
| D-006 | Content editor/storage/video delivery and offline requirements                              | Product/Architecture        | Phase 3  | Lesson/resource model and costs              |
| D-007 | DPDP source documents, control taxonomy and SME/counsel authority                           | Compliance Product/Legal    | Phase 4  | DPDP content cannot be approved              |
| D-008 | Assessment high-stakes/proctoring/identity/appeal policy                                    | Academic Product/Legal      | Phase 5  | Attempt and integrity workflow               |
| D-009 | Certificate accreditation, signatory, public holder-name consent and renewal                | Product/Legal               | Phase 6  | Template/verification/retention              |
| D-010 | At-risk definitions and permissible mentor data                                             | Learning Product/Privacy    | Phase 8  | Signals and intervention UX                  |
| D-011 | AI provider regions, model allowlist, no-training terms and review thresholds               | AI/Security/Legal           | Phase 10 | Engine activation                            |
| D-012 | Billing model, seats/usage, taxes/GST, invoicing, refunds and currencies                    | Finance/Product             | Phase 11 | Catalog and provider implementation          |
| D-013 | Hiring-partner verification, eligibility/ranking and reveal approval authority              | Career Product/Legal        | Phase 12 | Career/RLS workflow                          |
| D-014 | Retention schedule per category/jurisdiction and legal-hold authority                       | Legal/Privacy               | Phase 13 | Deletion/analytics/audit operations          |
| D-015 | SLO, RTO, RPO, support and incident notification commitments                                | Executive/Ops/Security      | Phase 14 | Capacity/DR/launch sign-off                  |

## Risk Register

| ID    | Risk                                                                      | Likelihood / impact | Mitigation and trigger                                                                   | Owner               |
| ----- | ------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| R-001 | Named PRD/BRD/SRS/wireframes/ER/QA/hiring documents are absent            | High / High         | Obtain originals; trace each requirement to blueprints before affected phase             | Product             |
| R-002 | Existing migration conflicts with final model or was applied externally   | Medium / High       | Inventory environments/migration history; decide D-001; never rewrite applied migration  | Data                |
| R-003 | RLS complexity causes data leakage or poor query latency                  | Medium / Critical   | Policy helpers, two-tenant tests, indexed predicates, plan/load review per migration     | Security/Data       |
| R-004 | Service-role use creates an unmonitored bypass                            | Medium / Critical   | Isolate workloads, domain functions, no browser exposure, audit and key rotation         | Security            |
| R-005 | Enterprise hierarchy permits sibling/ancestor overreach                   | Medium / High       | Decide D-002; explicit descendant helper and adversarial hierarchy tests                 | Architecture        |
| R-006 | DPDP implementation is legally incomplete or outdated                     | Medium / Critical   | Counsel/SME approval, effective-dated content/policies and change monitoring             | Privacy/Legal       |
| R-007 | Rights deletion conflicts with credentials, tax, audit or backup evidence | High / High         | Category policy/exception matrix, legal holds, anonymization and restore reapply runbook | Privacy/Data        |
| R-008 | AI leaks data or produces consequentially wrong/biasing output            | Medium / Critical   | Risk tiers, minimization, benchmarks, human review and disable controls                  | AI/Security         |
| R-009 | Hiring partners scrape/reuse candidate PII                                | Medium / Critical   | Redacted search, narrow expiring grants, anti-abuse controls, contracts and reveal audit | Career/Privacy      |
| R-010 | Assessment answer keys leak through client/RLS/AI context                 | Medium / Critical   | Separate protected table, safe form projection, bundle/API tests and AI exclusion        | Assessment/Security |
| R-011 | Webhook duplication/order corrupts billing or notifications               | Medium / High       | Signature, event dedupe, reconciliation, durable jobs and replay tests                   | Integrations        |
| R-012 | Analytics enables cross-tenant or small-group re-identification           | Medium / High       | Tenant facts, pseudonyms, minimum cells, governed exports and access audits              | Analytics/Privacy   |
| R-013 | Provider outage or lock-in blocks core journeys                           | Medium / Medium     | Internal contracts, durable state/retries, fallback only under equivalent policy         | Architecture/Ops    |
| R-014 | Storage objects outlive parent retention or signed links leak             | Medium / High       | Object metadata ownership, lifecycle jobs, short grants and download audit               | Data/Security       |
| R-015 | Broad admin experiences normalize excessive privilege                     | Medium / High       | Permission bundles, step-up, support grants and no blanket PII access                    | Security/Product    |
| R-016 | Scale targets overwhelm unpartitioned event/attempt tables                | Medium / High       | Partition gates, cursor APIs, async aggregates and representative load tests             | Data/Ops            |
| R-017 | Accessibility/localization added after component design                   | Medium / High       | WCAG/locale acceptance from first screen; design-system audits                           | Design/Product      |
| R-018 | Dependency/runtime drift makes CI differ from production                  | Medium / Medium     | Pin Node 22, lockfile, CI build artifact and automated update policy                     | Platform            |

## Rejected Assumptions

- A platform or super administrator automatically needs all tenant PII.
- Service-role credentials are an acceptable application authorization shortcut.
- DPDP requires separate tables or code paths for learning content.
- One role enum can model enterprise, content, mentor, compliance and resource scopes.
- Browser redirects prove payment completion.
- Public certificate verification can query internal certificate/profile records.
- Consent is a boolean or can be inferred from account creation.
- Deleting an account is equivalent to completing a rights request.
- AI provider output is a canonical score, legal answer or hiring decision.
- Realtime delivery is a durable audit/event mechanism.
- Soft deletion satisfies erasure.
- Provider dashboards are the only required operational record.

## Assumptions Pending Validation

- Organizations are the only tenant type and can own private content.
- A person may belong to multiple organizations with different roles.
- English is the initial locale but all content/notices are versioned by locale.
- Certificate holder display name may be public only under an approved notice/consent basis.
- Enterprise reporting uses privacy-safe aggregates unless explicit child-tenant authority is configured.
- PostgreSQL-backed durable jobs are adequate initially; a separate queue is introduced only after measured need.

## Decision Process

An open decision records proposer, context, options, privacy/security/data/operational consequences, chosen outcome, approvers, date and superseded decisions. Temporary defaults must fail closed: no minors, no high-risk AI, no cross-tenant enterprise rollup, no public PII, no PII reveal and no production deletion until the respective decisions are approved.
