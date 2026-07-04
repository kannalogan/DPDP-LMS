# Supabase Environment Setup

## Environment Separation

| Environment | Project                                | Data                                         | Linking/deployment authority           |
| ----------- | -------------------------------------- | -------------------------------------------- | -------------------------------------- |
| Local       | Repository-isolated Supabase CLI stack | Synthetic test fixtures only                 | Developer; no hosted link              |
| Staging     | Dedicated hosted project               | Synthetic or approved de-identified fixtures | CI release identity after review       |
| Production  | Dedicated hosted project               | Production data                              | Protected CI environment with approval |

Never reuse project references, database passwords, service keys, webhook secrets, Storage buckets or provider credentials between environments.

## Local Setup

1. Install Docker-compatible container tooling and a stable Supabase CLI using the official instructions.
2. Do not run `supabase link` in this repository for local work.
3. Run `npm run db:local:check` and resolve prerequisite failures.
4. Run `npm run db:local:start` to start only the stack defined by `supabase/config.toml`.
5. Use CLI-emitted local URLs and keys only in an ignored `.env.local`.
6. Run `npm run db:validate` to apply pending migrations, lint and execute pgTAP tests.
7. Stop without deleting volumes using `npm run db:local:stop`.

The harness refuses to start or validate when `supabase/.temp/project-ref` exists or remote credential variables are present. It does not inspect or connect to the separately installed PostgreSQL database named `dpdp`.

If Docker or the stable Supabase CLI is unavailable, run `npm run db:check` for complete static validation. Runtime commands print `SKIPPED`, exit nonzero and do not claim the migration ran. Install prerequisites later from the official [Supabase CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started); installation is never automatic.

Reset is deliberately separate from validation. Only the literal command `SYRA_CONFIRM_LOCAL_RESET=syra-local npm run db:reset-local` may reset the isolated CLI database. It still refuses hosted links and credential-bearing environments.

## Staging Setup

- Resolve DB-002 and DB-022 before project creation.
- Record project reference, region, PostgreSQL version, enabled extensions, backup/PITR tier and owner in the controlled environment registry, not this repository.
- Store access tokens, database passwords and service keys in the protected CI environment only.
- Link and deploy only in an ephemeral CI job after static checks, approved migration plan, backup confirmation and `db push --dry-run` review.
- Run schema fingerprint, migration ledger, RLS/pgTAP, smoke and rollback-verification checks after deployment.
- No developer workstation service-role key is accepted as staging deployment authority.

## Production Setup

- Require protected branch, separate release identity, two-person approval and a maintenance/runbook decision.
- Verify backup/PITR and Storage recovery separately before migration.
- Capture pre-deploy schema fingerprint, migration ledger and lock/backfill impact.
- Apply only the exact artifact validated in staging; never generate migrations in production.
- Verify post-deploy fingerprint, RLS tests, immutable protections, workload health and audit evidence.
- Stop on unexplained drift. Do not use `migration repair` to conceal it.

## Key Safety

- Browser code may receive only the environment's publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`, database passwords and personal access tokens are server/CI secrets and never use a `NEXT_PUBLIC_` prefix.
- Service-role clients are workload-specific and cannot be imported into client bundles.
- Examples contain placeholders only. Real values must not be committed, printed by CI or placed in documentation.
- Remote `db push`, `db reset`, `migration repair` and destructive commands are intentionally absent from package scripts.
