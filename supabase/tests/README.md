# Database Tests

The RLS and seed test designs are in `docs/35-rls-test-strategy.md` and `docs/36-seed-validation-strategy.md`.

`001_trust_foundation_test.sql` validates the Prompt #007 foundation, deny-by-default RLS posture, empty registries and immutable audit trigger. Tests run only against the isolated local Supabase stack.

`002_identity_platform_test.sql` validates the Prompt #008 identity/RBAC wave. `003_learning_domain_test.sql` validates the Prompt #011 canonical learning tables, forced RLS, policy inventory, published-version immutability, and absence of fake learning rows.

`004_learning_delivery_test.sql` validates the Prompt #012 controlled delivery RPCs, encrypted-note enforcement, learning-object storage policies, write triggers, and anonymous execution denial.

`005_assessment_engine_test.sql` validates the Prompt #013 canonical assessment tables, forced RLS, controlled attempt RPCs, immutable submission, service-only answer keys, and absence of fake assessments.
