# Database Assets

The frozen database authority is `docs/21-master-database-contract.md` through `docs/30-database-open-decisions.md`.

`migrations/0001_core_learning_platform.sql` is a quarantined historical asset. It is not the approved baseline, must not be edited or replayed, and is pinned in `migration-inventory.tsv`. ADR-001 selects forward reconciliation after environment inventory.

The first forward reconciliation migration is `supabase/migrations/20260704000100_trust_foundation.sql`. It implements only the ADR-002 trust foundation and does not replay the legacy file. No executable seed exists.

New migrations require the admission header and checks described in `docs/33-database-test-harness.md`.
