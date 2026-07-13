# Database Migration Test Harness

## Scope

The Phase 0 harness validates repository contracts and prepares an isolated local Supabase runtime. It never discovers or connects to the developer's `dpdp` database and has no remote deployment command.

## Commands

| Command                       | Purpose                                                     | Connection behavior    |
| ----------------------------- | ----------------------------------------------------------- | ---------------------- |
| `npm run db:check`            | Validate frozen counts, required files and migration policy | No database/network    |
| `npm run db:check:contract`   | Validate docs 21-30 contract metrics                        | No database/network    |
| `npm run db:check:migrations` | Validate inventory, checksums, headers and forbidden SQL    | No database/network    |
| `npm run db:local:check`      | Check Docker, CLI, config and remote-link isolation         | No database connection |
| `npm run db:local:start`      | Start the repository's isolated Supabase stack              | Local containers only  |
| `npm run db:local:status`     | Show local stack status                                     | Local containers only  |
| `npm run db:validate`         | Apply pending local migrations, DB lint and pgTAP tests     | Local Supabase only    |
| `npm run db:lint`             | Run PostgreSQL function/schema lint                         | Local Supabase only    |
| `npm run db:types`            | Blocked placeholder until foundation runtime validation     | No connection; exits 2 |
| `npm run db:reset-local`      | Confirmed reset of only the isolated local stack            | Local Supabase only    |
| `npm run db:local:stop`       | Stop this repository's local stack without deleting volumes | Local containers only  |

The scripts require an installed stable Supabase CLI and Docker-compatible runtime. They do not install dependencies, log in, link projects, accept a database URL or run `db push`.

## Migration Admission Header

Every future SQL migration outside the quarantined inventory must begin with comments containing:

```sql
-- SYRA-CONTRACT: docs/23-master-table-catalog.md#approved-section
-- SYRA-ADR: ADR-NNN or none-additive
-- SYRA-CHANGE: additive | backfill | contract
-- SYRA-PII: none | P1 | P2 | P3 | P4
-- SYRA-RLS: class-and-test-reference
-- SYRA-IMMUTABLE: none | affected-table-and-enforcement
```

Rules enforced statically:

- the contract reference must point to docs 21-30;
- destructive SQL requires an ADR, never `none-additive`;
- `CREATE TABLE` requires an explicit PII and RLS declaration;
- immutable-table update/delete statements are rejected;
- seed-like DML is forbidden in migrations;
- the quarantined legacy migration must retain its approved checksum;
- public-prefixed service credentials and client-marked service-role references are rejected;
- no migration is valid merely because it parses.

## Runtime Validation Sequence

For Prompt #007 and later approved migrations:

1. Start the isolated stack with `npm run db:local:start`.
2. Run static gates with `npm run db:check`.
3. Apply pending migrations with `supabase migration up --local`.
4. Run `supabase db lint --local --schema public --level warning --fail-on error`.
5. Run `supabase test db --local` for pgTAP contract, RLS and immutability tests.
6. Generate a schema-only diff and require no unexplained output.
7. Generate TypeScript database types and compare them with the committed artifact.

Prompt #025 adds `scripts/database/check-ai-execution.sh` plus `supabase/tests/016_ai_provider_execution_test.sql`. These gates assert the execution table/view/RPC inventory, forced RLS, immutable evidence, absence of anonymous policies, and absence of provider credentials or prompt/response plaintext columns.

Schema-diff and generated-type gates remain disabled until the trust-foundation runtime suite passes. A destructive local rebuild is separate and requires `SYRA_CONFIRM_LOCAL_RESET=syra-local npm run db:reset-local`.

Supabase documents the local stack, `db lint`, pgTAP-backed `test db`, and migration history behavior in its [CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started), [testing guidance](https://supabase.com/docs/guides/local-development/cli/testing-and-linting), and [migration guide](https://supabase.com/docs/guides/deployment/database-migrations).
