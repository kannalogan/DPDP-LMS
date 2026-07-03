# RLS And Security Model

## Security Invariants

1. Every request is untrusted until Supabase Auth establishes `auth.uid()` and server code resolves an active organization membership.
2. Tenant-owned rows are filtered by `organization_id`; parent joins must preserve the same organization.
3. Roles grant permissions within explicit scope. Role names are not used as scattered policy logic.
4. RLS protects reads and writes even when route or Server Action checks are missing.
5. Browser clients receive the publishable/anon key only. The service-role key is restricted to isolated server/Edge Function operations and never represents a human administrator.
6. Compliance-critical event tables are append-only for every interactive role, including Super Admin.
7. Public access exists only through narrow projections/functions with non-enumerable identifiers and rate limits.

## Canonical Roles

| Role                    | Scope                                     | Baseline permissions                                                                            |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Guest                   | Public                                    | Read published public catalog metadata; exact-token certificate verification                    |
| Student                 | Self + active enrollments/cohorts         | Learn, submit own work, view released results, manage own privacy choices                       |
| Mentor                  | Assigned cohorts and active dates         | Read assigned learner progress/results permitted by policy; record interventions                |
| Instructor              | Assigned course/question scopes           | Author and review content/assessments; cannot infer unrelated learner data                      |
| Organization Admin      | One organization                          | Membership, enrollment, cohorts, tenant settings and reports                                    |
| Enterprise Admin        | Explicit organization tree                | Organization administration and approved aggregates across descendants                          |
| Platform Admin          | Platform operational scope                | Catalog/system operations through audited commands; no unrestricted PII read                    |
| Super Admin             | Time-bound break-glass scope              | Emergency platform operation with approval and session audit; immutable tables remain immutable |
| Hiring Partner          | Approved partner organization/opportunity | Read redacted candidates and explicitly granted PII fields                                      |
| TPO / Placement Officer | Assigned tenant/cohorts/opportunities     | Coordinate candidates and partners under consent policy                                         |

`Compliance Admin`, `Course Admin`, `Content Admin` and `Mentor Admin` are permission bundles scoped through `member_role_assignments`, not additional global identities.

## Authorization Data Path

1. Supabase verifies the session and exposes `auth.uid()`.
2. Policy helper resolves `profiles.id = auth.uid()` and an active `organization_members` row.
3. Permission helper checks active role assignment, role permission, scope type/ID and assignment dates.
4. Row policy checks tenant and resource relationship: ownership, enrollment, cohort assignment, content assignment, or explicit grant.
5. Mutations use `WITH CHECK` to prevent moving a row into another tenant or unauthorized scope.

JWT custom claims may cache low-volatility platform attributes, but organization membership and permissions are database-authoritative because revocation must take effect without waiting for token refresh.

## Policy Helper Contract

Helpers live in a protected schema, use `SECURITY DEFINER` only when necessary, set a fixed `search_path`, qualify every object, and are not writable by application roles. Required conceptual helpers:

- `current_profile_id()`
- `is_active_member(organization_id)`
- `has_permission(organization_id, permission_key, scope_type, scope_id)`
- `is_enrolled(profile_id, course_version_id)`
- `is_active_cohort_mentor(cohort_id)`
- `is_enterprise_descendant(parent_organization_id, child_organization_id)`
- `has_active_pii_grant(request_id, field_category)`

Helpers return booleans and never return whole privileged rows. Their access paths must be indexed and tested for policy recursion.

## Access Matrix

Legend: `O` own, `A` assigned scope, `T` tenant, `E` enterprise tree, `P` platform operation, `G` governed projection, `–` denied.

| Resource                  | Guest                   | Student                        | Mentor             | Instructor                  | Org Admin                      | Enterprise Admin               | Platform/Super Admin    | Hiring Partner              | TPO                        |
| ------------------------- | ----------------------- | ------------------------------ | ------------------ | --------------------------- | ------------------------------ | ------------------------------ | ----------------------- | --------------------------- | -------------------------- |
| Profiles                  | –                       | O                              | A-minimal          | A-minimal                   | T-minimal                      | E-minimal                      | G support projection    | consented fields            | T-minimal                  |
| Organizations/memberships | public name only        | own memberships                | A membership names | assigned content users      | T                              | E                              | P metadata              | partner own                 | T                          |
| Published catalog         | public-enabled          | entitled/global                | A/global           | assigned drafts + published | T                              | E                              | P                       | opportunity-relevant public | T                          |
| Enrollment/progress       | –                       | O                              | A                  | assigned course aggregate   | T                              | E aggregate                    | G support               | –                           | assigned candidate summary |
| Attempts/responses        | –                       | O released/safe                | A released         | assigned evaluation         | T governed                     | E aggregate                    | no content by default   | –                           | approved outcome only      |
| Mentor notes              | –                       | visible-to-learner only        | A                  | –                           | metadata/policy                | aggregate                      | no content by default   | –                           | –                          |
| Certificates              | exact public projection | O                              | A status           | assigned course status      | T                              | E                              | credential operation    | consented/public            | T                          |
| Consent/privacy cases     | –                       | O                              | –                  | –                           | explicit compliance permission | explicit compliance permission | G case support only     | own reveal request status   | assigned workflow          |
| Candidate search/PII      | –                       | O                              | –                  | –                           | policy metadata                | policy metadata                | verification metadata   | redacted/G grant            | assigned T                 |
| Billing                   | –                       | –                              | –                  | –                           | billing permission             | billing permission             | provider reconciliation | partner own subscription    | –                          |
| Audit evidence            | –                       | own safe events where required | own actions        | own actions                 | T auditor permission           | E auditor permission           | P auditor permission    | own reveal actions          | T placement actions        |

## Table Policy Intent

### Tenant And RBAC

- `organizations`: select when active member, authorized enterprise ancestor, or platform operation. Insert/update through commands with audit. Parent changes require cycle and enterprise-scope validation.
- `organization_members`: self select plus scoped member-read permission. Membership creation/termination requires member-manage permission. A policy/function prevents removal of the final active owner.
- Role assignments: grantee may view own grants. Grantor must hold both role-management permission and every permission being delegated; nobody may delegate beyond their scope or duration.

### Learning And Content

- Global published tracks/course versions are readable according to catalog visibility. Tenant-private content requires active membership and entitlement.
- Draft content requires explicit content assignment. Publishing calls a validated server function that freezes the version.
- Learners cannot select question banks, answer keys, draft rubrics or hidden evaluation guidance.
- Storage object access is granted only after the parent resource policy succeeds; bucket policies mirror database authorization and use short-lived signed URLs.

### Student Progress And Assessment

- Students select only their own enrollments, progress, attempts and released evaluations.
- Attempt insert requires an active assignment, open window, remaining attempt count and matching `auth.uid()`; callers cannot choose score, result or evaluator fields.
- Responses can mutate only while the attempt is active and before server expiry/submission. Submitted attempts and responses become immutable.
- Mentors select learner records only through active `mentor_assignments → cohort_members`; assignment end immediately removes visibility.
- Instructor/evaluator access is limited to assigned assessment/course and excludes identity when blind marking is enabled.

### Certificates

- Authenticated certificate reads require holder identity or credential-report permission in the issuing tenant.
- Anonymous verification accepts an exact high-entropy token through a server function and returns `certificate_public_views` only.
- Issuance, expiry and revocation are state-transition functions. Status history cannot be updated or deleted.

### Candidate And PII Reveal

- Hiring partners query `candidate_search_profiles` only when partner approval, opportunity status and candidate visibility grant are active.
- A reveal request does not grant access. Access requires an approved decision, unexpired grant, matching partner user, purpose, opportunity and requested field.
- Revealed fields are returned by a field-allowlisting function; never by selecting the base profile.
- Every successful reveal appends `pii_reveal_events` in the same transaction. If evidence insertion fails, disclosure fails.
- Consent withdrawal/revocation blocks future reads immediately; immutable historical reveal evidence remains.

### Compliance And Audit

- Subjects can read their own consent receipts and privacy-case safe projection.
- Compliance staff need an explicit, time-bound permission for case details. Organization Admin alone does not imply privacy-case access.
- `audit_events`, `consent_events`, `pii_reveal_events`, `retention_executions`, `certificate_status_events`, `payment_events` and equivalent facts expose no update/delete policy.
- Platform/Super Admin cannot bypass immutability. Exceptional database maintenance uses a separate controlled identity, dual approval, incident/change ticket and out-of-band audit.

## Service Role And Edge Functions

The service role bypasses RLS and is therefore limited to workloads that cannot run under a user JWT: verified provider webhooks, scheduled retention/certificate expiry, notification delivery and tightly scoped batch jobs. Each workload:

- validates a signed event or internal job claim;
- resolves and writes `organization_id` explicitly;
- calls domain functions rather than issuing broad table mutations;
- uses an idempotency key;
- records correlation and audit events;
- never returns service-role data directly to a browser.

Where possible, Edge Functions forward the user JWT to Supabase so RLS remains active.

## Realtime Security

- Realtime is enabled only for explicit tables and columns.
- Database RLS applies to Postgres Changes subscriptions.
- Channel topics include non-secret stable IDs and are authorized server-side; topic knowledge does not grant access.
- Presence/broadcast payloads contain no PII, assessment answers or secrets.
- Revoked memberships and mentor assignments terminate/re-authenticate subscriptions.

## Request Security

- Server Actions verify origin, authenticated identity, tenant, permission and Zod input; they do not trust hidden fields.
- Route Handlers use same-site secure cookies, CSRF origin checks for cookie-authenticated mutations, request size limits and content-type allowlists.
- API keys use Authorization headers and are not accepted in query strings.
- Rate limits key on route risk plus tenant, actor/client and privacy-preserving network fingerprint.
- Sensitive responses set `Cache-Control: private, no-store`; public catalog/verification uses bounded cache keys without token leakage.

## Test Requirements

For every tenant table, automated integration tests create two organizations and prove cross-tenant select/insert/update/delete denial. Every role/resource combination gets positive and negative tests. Additional mandatory cases cover expired assignments, revoked membership, stale JWT claims, draft content, submitted attempts, hidden answer keys, certificate token enumeration, withdrawn consent, expired PII grants, immutable log mutation, enterprise hierarchy boundaries and service-role function input validation.

## Security Review Gates

- No table enters production with RLS disabled unless it is an explicitly public, non-sensitive lookup reviewed by Security.
- No policy uses `true` for authenticated writes.
- No client bundle contains service-role, provider or webhook secrets.
- No administrator role receives blanket PII access.
- Policy performance is measured with realistic tenant cardinality before launch.
