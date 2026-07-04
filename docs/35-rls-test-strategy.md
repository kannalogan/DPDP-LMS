# RLS Test Strategy

## Admission Rule

Every physical application table must have its `S0`-`S9` class from `docs/23-master-table-catalog.md` and `docs/28-database-security-matrix.md` cited before RLS SQL is reviewed. Every PII-bearing table requires an explicit PII level, permitted actors, operations, row predicate, protected fields and audit behavior. Missing classification blocks migration admission.

## Test Identities

The future local pgTAP fixture will create synthetic identities for public, unaffiliated authenticated, student, mentor, organization admin, enterprise admin, platform operator and named service workload contexts. It will include tenant A, tenant B, enterprise siblings, multi-membership, expired membership, revoked assignment and break-glass denial cases.

## Required Matrix

For each table and applicable role, test `SELECT`, `INSERT`, `UPDATE` and `DELETE` independently:

- permitted own, assigned, tenant or global row;
- same-role row in another tenant;
- forged `organization_id`, owner ID or parent relationship;
- reassignment through `UPDATE` and `WITH CHECK`;
- missing, expired and revoked membership/assignment;
- direct base-table access when only a projection is allowed;
- function execution and default grant exposure;
- Realtime visibility for the 12 approved tables.

## Mandatory High-Risk Suites

- `question_answer_keys`: no learner/client/broad-admin read.
- A2 immutable tables: interactive and service roles cannot update or delete; approved append path only.
- Candidate PII: no cross-purpose, expired, bulk, prefetch or administrator override path.
- Audit/privacy/legal-hold data: no implicit organization-admin access.
- Certificates: anonymous access only through exact-token public projection.
- AI protected content: metadata access never reveals encrypted/plain content.
- Storage: bucket, path, MIME, owner and parent authorization must all agree.
- Tenant predicates: no FK or JSON payload can smuggle cross-tenant ownership.

## Test Quality Gates

- Tests run in transactions and leave no fixture residue.
- Policy tests use the same claims/session mechanism as Supabase clients, not database-superuser shortcuts.
- Service-role tests prove narrow workload preconditions and audit effects; they do not accept blanket bypass as success.
- Every security defect adds a regression test before policy correction.
- Representative cardinality receives `EXPLAIN` checks for policy predicates and required leading indexes.

No pgTAP SQL is created in Prompt #006 because RLS implementation and the approved baseline schema do not yet exist.
