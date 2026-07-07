# ADR-007: Certificate Lifecycle Contract

## Status

Accepted.

## Context

Prompt #014 asks for certificate issuance, verification, revocation evidence, assets, downloads, organization policies and numbering. The frozen database contract defines the certificate domain as six physical tables plus one protected projection:

- `certificate_templates`
- `certificate_template_versions`
- `certificate_eligibility_records`
- `certificates`
- `certificate_status_events`
- `certificate_verification_events`
- `certificate_public_views`

The same contract maps `certificate_verifications` to `certificate_verification_events` and `certificate_revocations` to `certificate_status_events`.

## Decision

Implement Prompt #014 on the canonical contract only. Do not create separate revocation, verification, badge, PDF, blockchain, wallet, hiring or gamification tables.

Operational concepts are represented as follows:

- Template publication and organization policy live in `certificate_templates` and `certificate_template_versions`.
- Issuance evidence lives in `certificate_eligibility_records`.
- Certificate numbering lives on immutable `certificates.certificate_number`.
- Certificate assets are referenced through `certificates.artifact_object_id -> storage_objects`.
- Revocation and expiry are append-only `certificate_status_events`.
- Download and public verification telemetry are append-only `certificate_verification_events`.
- Public verification reads only the exact-token `certificate_public_views` projection through `verify_certificate`.

## Consequences

Issued certificates are immutable production artifacts. Revocation never edits historical issuance facts; it appends status evidence and updates only the derived `current_status` pointer. Public verification never exposes internal UUIDs, tenant IDs, audit IDs, private metadata, assessment evidence or profile records.
