# ADR-001: Forward Reconcile Database History

- **Status:** Accepted
- **Date:** 2026-07-04
- **Decision owners:** Architecture, Data, Security, Operations
- **Contract:** `docs/21-master-database-contract.md` through `docs/30-database-open-decisions.md`
- **Resolves:** DB-001 for Phase 0 planning; environment evidence is still required before implementation

## Context

The repository contains one historical migration, `database/migrations/0001_core_learning_platform.sql`, created with the initial scaffold. There is no repository evidence showing whether it was applied to the developer's `dpdp` database or any hosted Supabase project. Prompt #006 explicitly prohibits connecting with real credentials, so Phase 0 cannot prove an environment is disposable.

The migration predates the frozen contract. It creates 12 of the 169 canonical physical-table names, three native enums, two authorization helpers, 16 policies and five learning-track rows. Its table shapes, role model, content versioning, assessment protection, AI storage and lifecycle vocabularies do not satisfy the frozen contract.

Resetting history would be safe only after proving that every target contains no shared, staging or production data and has no externally relied-on migration history. That proof is unavailable.

## Decision

**Forward reconcile existing migration history.**

1. Preserve `database/migrations/0001_core_learning_platform.sql` byte-for-byte as historical evidence.
2. Mark it `quarantined` in `database/migration-inventory.tsv`. It is not copied into `supabase/migrations` and must not be replayed by the Phase 0 harness.
3. Inventory each local, staging and production environment separately before writing reconciliation SQL.
4. Treat the frozen names and ownership in docs 21-30 as the target. Existing objects are source-state facts, not design authority.
5. Produce additive reconciliation waves only after the relevant ADRs and contract references are approved. Destructive cleanup is deferred to a later expand/migrate/contract phase.
6. Do not repair hosted migration history, reset a database, or mark a migration applied without an environment-specific runbook and approval.

## Consequences

- No existing data or unknown migration ledger is silently discarded.
- Prompt #007 must begin with read-only environment inventories and compare their fingerprints with the repository inventory.
- The first production migration remains intentionally absent.
- Temporary compatibility objects may be proposed only by ADR; they cannot rename or replace frozen entities.
- Reconciliation is more deliberate than a clean reset, but it is the only decision compatible with unknown deployment state.

## Rejected Alternative

**Reset database history** was rejected because the existence, use and data content of the developer database and any hosted projects are unverified. A reset may be reconsidered only for a proven disposable environment; it does not change the project-wide forward-reconciliation decision.

## Exit Criteria

This ADR is ready for implementation planning when every target environment has:

- a read-only object and migration-history inventory;
- owner confirmation of data criticality and reset prohibition;
- an approved backup/PITR and recovery statement;
- a drift report against docs 21-30;
- an approved first reconciliation wave with rollback limitations and verification tests.
