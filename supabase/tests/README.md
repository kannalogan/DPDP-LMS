# Database Tests

The RLS and seed test designs are in `docs/35-rls-test-strategy.md` and `docs/36-seed-validation-strategy.md`.

`001_trust_foundation_test.sql` validates the Prompt #007 foundation, deny-by-default RLS posture, empty registries and immutable audit trigger. Tests run only against the isolated local Supabase stack.

`002_identity_platform_test.sql` validates the Prompt #008 identity/RBAC wave. `003_learning_domain_test.sql` validates the Prompt #011 canonical learning tables, forced RLS, policy inventory, published-version immutability, and absence of fake learning rows.

`004_learning_delivery_test.sql` validates the Prompt #012 controlled delivery RPCs, encrypted-note enforcement, learning-object storage policies, write triggers, and anonymous execution denial.

`005_assessment_engine_test.sql` validates the Prompt #013 canonical assessment tables, forced RLS, controlled attempt RPCs, immutable submission, service-only answer keys, and absence of fake assessments.

`006_certificate_engine_test.sql` validates the Prompt #014 canonical certificate tables, forced RLS, controlled certificate RPCs, public projection, immutable lifecycle evidence, and absence of fake certificates.

`007_mentor_workspace_test.sql` validates the Prompt #015 mentor workspace migration, including mentor/cohort tables, safe projections, controlled RPCs, forced RLS and absence of business seed assignments.

`008_admin_workspace_test.sql` validates the Prompt #016 admin workspace migration, including admin tables, reused organization authority tables, controlled RPCs, RLS, immutable dashboard evidence and no business seed events.

`009_course_authoring_test.sql` validates the Prompt #017 authoring migration, including draft, review, publishing, lock, projection, RPC, RLS, and immutable publication evidence inventory.

`010_question_authoring_test.sql` validates the Prompt #018 question bank and assessment authoring migration, including draft, import, template, projection, RPC, RLS, canonical runtime reuse, and immutable publication evidence inventory.

`011_assignment_grading_test.sql` validates Prompt #020 assignment ownership, grading release, projections and immutable evidence.

`012_notification_platform_test.sql` validates Prompt #021 notification templates, inbox ownership, controlled preference/read RPCs, reporting projections, and forced RLS.

`013_governance_platform_test.sql` validates Prompt #022 governance controls, evidence, privacy and retention tables; reporting projections; controlled RPC signatures; forced RLS; and absence of anonymous policies.

`014_search_discovery_platform_test.sql` validates Prompt #023 authorized search documents, private saved/history entities, rule-based recommendation projections, controlled search RPCs, forced RLS, full-text indexing, and absence of anonymous policies.

`015_ai_platform_test.sql` validates Prompt #024 provider-neutral metadata, controlled AI RPCs, forced RLS, immutable evidence, reporting projections, and the absence of credentials, vectors, provider SDK configuration, and anonymous policies.

`016_ai_provider_execution_test.sql` validates Prompt #025 execution policies, model routing, budgets, immutable attempts and outcomes, controlled RPCs, redacted projections, forced RLS, and the absence of provider credentials.

`017_ai_learning_assistant_test.sql` validates Prompt #026 learner session, flashcard, quiz, plan, recommendation and event entities; controlled generation RPCs; metadata-only projections; and forced RLS.
`018_community_live_learning_test.sql` validates the Prompt #027 tables, safe projections, controlled RPC surface, forced RLS, and immutable communication evidence.
