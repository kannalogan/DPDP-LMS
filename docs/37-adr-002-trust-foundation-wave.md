# ADR-002: Trust-Foundation Reconciliation Wave

- **Status:** Accepted
- **Date:** 2026-07-04
- **Decision owners:** Architecture, Data, Security
- **Contract:** `docs/21-master-database-contract.md` through `docs/31-adr-001-forward-reconcile-database-history.md`
- **Resolves for this wave:** DB-003, DB-004, DB-005 and DB-006

## Context

ADR-001 requires forward reconciliation and preserves the quarantined legacy migration. Prompt #007 authorizes the first implementation wave but forbids a full 169-table rollout, business seeds and final authentication/RBAC policies.

The legacy migration may already have created `organizations` and `organization_members`. Its membership key uses `user_id` and an embedded role enum, while the frozen contract requires `profile_id` plus separate scoped role assignments. Applied state is still unknown because this work cannot connect to the developer's `dpdp` database or any hosted environment.

## Decisions

1. Use `public` for application tables and a locked `private` schema only for invariant trigger helpers. This resolves DB-004 for the foundation.
2. Use the frozen single-parent `organizations.parent_id` hierarchy. This resolves DB-003; affiliation graphs remain out of scope.
3. Use `gen_random_uuid()` UUIDs. This resolves DB-006 until an approved UUIDv7 benchmark ADR.
4. Use checked `text` for evolving lifecycle domains and native enums only for the stable `risk_level` and `audit_outcome` domains in this wave. This resolves DB-005 consistently with the enum catalog.
5. Enable only foundation-required `pgcrypto` and `citext`. Search, vector, Cron and test-only extensions remain demand-driven.
6. Create 11 minimum foundation tables: `organizations`, `profiles`, `organization_members`, `roles`, `permissions`, `role_permissions`, `member_role_assignments`, `storage_objects`, `system_config_versions`, `processing_purposes` and `audit_events`.
7. Keep every foundation table deny-by-default: enable and force RLS, create no permissive policy, retire the three known legacy organization/membership policies, and revoke table access from `anon`, `authenticated` and `service_role` until a later policy/grant migration cites its workload.
8. Protect `audit_events` with an update/delete rejection trigger in addition to revoked privileges. Audit append functions and hash computation remain a later security-reviewed wave.
9. Use Supabase's managed migration ledger plus the repository checksum inventory. No competing application migration table is introduced.

## Legacy Expand Path

The migration creates canonical tables on a fresh Supabase stack. If legacy `organizations` exists, it adds missing contract columns without deleting data. If legacy `organization_members.user_id` exists, it adds the canonical identity, profile, status, lifecycle and attribution columns but leaves `profile_id` nullable and retains the legacy key/role columns. The known legacy policies on those two tables are removed because they encode the superseded global-role model and conflict with the required deny-by-default posture.

That compatibility state is intentional expand-phase debt, not a contract change. A later migration may backfill `profiles`, validate membership foreign keys, enforce canonical nullability/key constraints and eventually remove legacy columns only after environment inventory, verification and a destructive-change ADR.

## Consequences

- Fresh local/CI databases receive the canonical trust foundation.
- Unknown legacy databases are not reset or destructively rewritten.
- No role, permission, organization, profile, purpose, configuration or audit rows are seeded.
- Final RLS policies, grants, audit append functions, retention partitions and generated TypeScript types remain blocked.
- DB-009, DB-010, DB-013, DB-014, DB-015 and DB-022 remain open.

## Validation

Static checks assert migration order, contract headers, required objects, RLS statements, immutability guards, absence of seed DML and the legacy checksum. Local pgTAP tests validate the resulting fresh Supabase schema when Docker and the Supabase CLI are available.
