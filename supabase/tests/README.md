# Database Tests

The RLS and seed test designs are in `docs/35-rls-test-strategy.md` and `docs/36-seed-validation-strategy.md`.

`001_trust_foundation_test.sql` validates the Prompt #007 foundation, deny-by-default RLS posture, empty registries and immutable audit trigger. Tests run only against the isolated local Supabase stack.

`002_identity_platform_test.sql` validates the Prompt #008 identity/RBAC wave. `003_learning_domain_test.sql` validates the Prompt #011 canonical learning tables, forced RLS, policy inventory, published-version immutability, and absence of fake learning rows.
