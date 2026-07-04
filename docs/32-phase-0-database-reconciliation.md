# Phase 0 Database Reconciliation Report

## Repository State

| Asset                    | Observed state                                                       | Readiness disposition                                                           |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Historical migrations    | One file: `database/migrations/0001_core_learning_platform.sql`      | Quarantined; preserve checksum; do not replay                                   |
| Supabase project config  | None before Prompt #006                                              | Local-only `supabase/config.toml` added                                         |
| Supabase migrations      | None                                                                 | Correct for Phase 0; final schema migrations remain forbidden                   |
| Seed files               | No standalone seed; historical migration contains five track inserts | No seed is replayable; strategy only                                            |
| Schema snapshots/dumps   | None                                                                 | Environment inventory remains blocked pending authorized read-only access       |
| Generated database types | None                                                                 | Generation deferred until an approved reconciled schema exists                  |
| Database tests           | None                                                                 | RLS and seed test strategies defined; SQL tests wait for implementation         |
| CI database checks       | None before Prompt #006                                              | Static contract and migration checks added; runtime Supabase checks stay opt-in |
| Local PostgreSQL `dpdp`  | Existence reported by developer                                      | Not connected, inspected or assumed to match repository state                   |

## Historical Migration Inventory

The historical file contains:

- PostgreSQL `pgcrypto` extension;
- 3 native enums;
- 12 application tables;
- 5 explicit indexes;
- 2 authorization helper functions;
- RLS enabled on 12 tables and 16 policies;
- 5 inserted learning-track rows.

The file was introduced in commit `845ec3e`. Its approved checksum and quarantine state are recorded in `database/migration-inventory.tsv`.

## Contract Comparison

Name overlap does not imply shape compatibility. Twelve historical table names appear in the frozen catalog, but all require field, relationship, lifecycle or security reconciliation.

| Area               | Historical state                         | Frozen contract requirement                                         | Drift classification    |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| Membership         | `organization_members` has one enum role | Membership and scoped assignments are separate authorities          | Structural/security     |
| Profiles           | Direct `auth.users` references           | `profiles` is the application identity reference                    | Structural              |
| Content            | Mutable courses/modules/lessons          | Version authorities and immutable published artifacts               | Structural/immutability |
| Enrolment/progress | Percentage stored on `enrollments`       | Enrollment authority plus lesson/module/course progress projections | Structural              |
| Assessment         | Questions and answer keys colocated      | `question_answer_keys` is separate service-only authority           | Critical security       |
| Attempts           | Immediate score and response JSON        | Assignment, lifecycle, response and evaluation authorities          | Structural/security     |
| Certificates       | Verification code on credential          | Eligibility and append-only status/verification evidence            | Structural/audit        |
| AI                 | Input/output stored together             | Metadata, encrypted content, usage and safety authorities           | Critical privacy        |
| Status enums       | Reduced native enum values               | 52 logical enum contracts and 7 controlled domains                  | Semantic                |
| RLS                | Legacy role helpers and policies         | Per-table S0-S9 classification and adversarial matrix               | Critical security       |
| Seeds              | Track rows inside migration              | Versioned, validated, environment-safe seed process                 | Process                 |

The historical migration covers about 7% of canonical physical table names (12 of 169) and cannot serve as a baseline implementation of the frozen contract.

## Drift Rules

- Docs 21-30 are authoritative; the historical file is evidence only.
- No historical object is renamed or redesigned by this report.
- Any required deviation from the frozen contract must be proposed as a new ADR before SQL.
- Dashboard-created remote schema changes are drift and must not be normalized silently.
- Generated types are outputs of an approved schema, never a substitute for schema inventory.

## Phase 0 Result

ADR-001 selects forward reconciliation. This phase creates only static gates and local tooling. It does not establish that any database is clean, safe to reset, or ready for production migration.
