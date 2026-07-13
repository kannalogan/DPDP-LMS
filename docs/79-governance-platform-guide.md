# Governance Platform Guide

Controls, frameworks, evidence, risks, exceptions, compliance reviews, and dashboards are organization-scoped and managed through controlled RPCs. Published versions are immutable. Compliance officers receive explicit permission keys; administrative membership alone does not create direct table writes.

## Access model

- `governance.manage` controls governance, audit, risk, policy, exception, and retention operations.
- `compliance.review` permits evidence and compliance review workflows.
- `privacy.request.manage` permits organization privacy request operations.
- Account routes expose only the authenticated profile's policy assignments, acknowledgements, and privacy cases.

All tables force RLS. Application repositories read security-invoker projections and map records into DTOs. Application writes use Server Actions with request security checks and controlled RPCs; there are no direct client writes or service-role clients.

## Operating model

Controls and policies are drafted as versioned records, reviewed, and published. Published versions cannot be edited or deleted. New evidence creates a version with a SHA-256 evidence hash. Verification records the reviewer and decision while preserving the submitted version.

Risks retain inherent likelihood and impact, treatment plans, periodic reviews, residual exposure, and exception evidence. Dashboards and reporting use organization-scoped projections, never private request ciphertext or storage paths.

## Empty environments

No business seed data is installed. A new organization therefore sees real empty states until authorized users create records through the controlled workflows.
