# Trust-Foundation Implementation Status

## Wave 1 Scope

Migration `supabase/migrations/20260704000100_trust_foundation.sql` is the first executable implementation of the frozen database contract. ADR-002 limits it to prerequisites for future authentication and RBAC policy work.

| Foundation             | Implemented objects                                                   |
| ---------------------- | --------------------------------------------------------------------- |
| Extensions             | `pgcrypto`, `citext`                                                  |
| Stable native enums    | `risk_level`, `audit_outcome`                                         |
| Identity/tenant        | `organizations`, `profiles`, `organization_members`                   |
| Authorization          | `roles`, `permissions`, `role_permissions`, `member_role_assignments` |
| Storage trust metadata | `storage_objects`                                                     |
| Environment/config     | `system_config_versions`                                              |
| Compliance/audit       | `processing_purposes`, `audit_events`                                 |
| Protected helper       | `private.reject_immutable_mutation()` and audit trigger               |

All evolving lifecycle values use checked text according to the enum catalog. No role, permission, profile, tenant, purpose, config or audit data is inserted.

## Reconciliation Behavior

On a fresh Supabase stack, the migration creates the canonical foundation with keys, checks, indexes and relationships. When legacy `organizations` or `organization_members` exists, only safe additive columns and constraints are introduced.

Legacy membership remains expand-phase incomplete: `profile_id` may be nullable, and historical `user_id`, `role` and composite primary-key columns remain untouched. Environment inventory, profile backfill and constraint validation must precede any contract-phase removal.

## Security Posture

- RLS and FORCE RLS are enabled on all 11 tables.
- No RLS policy is created, and the three known legacy organization/membership policies are retired, so browser roles have no foundation policy path.
- Table privileges are revoked from `anon`, `authenticated` and `service_role` pending workload-specific grants.
- No service-role helper, client import or generic bypass function exists.
- `audit_events` rejects UPDATE and DELETE through an invariant trigger and privilege revocation.
- Audit append/hash-chain functions remain unimplemented until DB-014 is resolved.

## Validation Layers

`npm run db:check` runs without Docker, network or credentials and verifies:

- frozen contract counts and legacy checksum;
- active/legacy migration checksums, metadata/order and absence of seed DML;
- exact foundation object scope;
- required extensions/enums;
- RLS/FORCE RLS statements and absence of policies/broad grants;
- audit immutability trigger coverage;
- no public/client service-role references.

`npm run db:validate` additionally applies pending migrations to the isolated local Supabase stack, runs `db lint`, then executes `supabase/tests/001_trust_foundation_test.sql`. It exits with code 2 and a `SKIPPED` message when Docker, the CLI or a running local stack is unavailable.

## Intentionally Deferred

- final Auth hooks, user policies and RBAC policy helpers;
- role/permission/reference seeds;
- hosted environment links or deployment;
- legacy profile/membership backfill and destructive cleanup;
- audit append API, cryptographic hash computation, partitioning and external anchors;
- search, Realtime, Storage buckets, business-domain tables and generated TypeScript types.
