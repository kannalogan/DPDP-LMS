# Database Assets

The frozen database authority is `docs/21-master-database-contract.md` through `docs/30-database-open-decisions.md`.

`migrations/0001_core_learning_platform.sql` is a quarantined historical asset. It is not the approved baseline, must not be edited or replayed, and is pinned in `migration-inventory.tsv`. ADR-001 selects forward reconciliation after environment inventory.

No final production migration or executable seed exists in Phase 0. New migrations require the admission header and checks described in `docs/33-database-test-harness.md`.
