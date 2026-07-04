# Database Tests

The RLS and seed test designs are in `docs/35-rls-test-strategy.md` and `docs/36-seed-validation-strategy.md`.

`001_trust_foundation_test.sql` validates the Prompt #007 foundation, deny-by-default RLS posture, empty registries and immutable audit trigger. Tests run only against the isolated local Supabase stack.
