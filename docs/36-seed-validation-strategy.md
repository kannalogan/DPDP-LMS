# Seed Validation Strategy

## Phase 0 Position

No executable seed file is approved. The five learning-track inserts embedded in the quarantined historical migration are not a seed authority and must not be replayed by the new harness.

## Allowed Seed Classes

| Class                                          | Local                           | Staging                              | Production                       |
| ---------------------------------------------- | ------------------------------- | ------------------------------------ | -------------------------------- |
| Deployment-owned reference registries          | Approved deterministic versions | Approved release artifact            | Explicit release approval        |
| Synthetic security-test fixtures               | Allowed, test namespace         | Allowed only in isolated test tenant | Forbidden                        |
| Demo/course content                            | Optional separate fixture       | Product-approved synthetic content   | Separate governed content import |
| Users, credentials, PII, payment data, secrets | Synthetic Auth harness only     | De-identified/synthetic only         | Forbidden as repository seed     |

## Validation Rules

- Seed files are separate from schema migrations and are disabled by default.
- Every reference row has a stable natural key, owner, contract citation and expected version.
- Re-running a seed is deterministic and idempotent; it does not overwrite tenant customization.
- No seed changes immutable evidence or fabricates audit history.
- No plaintext secret, token, real email, phone, address, resume, assessment response or payment identifier is permitted.
- Foreign keys, uniqueness, enum/domain values and tenant boundaries are validated after seeding.
- Production reference-data changes use reviewed release artifacts and evidence, not developer fixtures.
- A checksum manifest identifies the exact seed artifact tested and promoted.

## Future Test Sequence

1. Static secret/PII and forbidden-table scan.
2. Apply to a fresh isolated local database after approved migrations.
3. Apply a second time and prove no row drift.
4. Validate expected natural keys and counts without relying on generated UUID values.
5. Run RLS tests to prove fixtures do not broaden access.
6. Reset and repeat to prove reproducibility.

Supabase executes configured seeds on local start/reset, so `supabase/config.toml` keeps seeding disabled until a reviewed artifact exists. See the official [seeding guide](https://supabase.com/docs/guides/local-development/seeding-your-database).
