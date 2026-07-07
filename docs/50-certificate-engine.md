# Certificate Engine Implementation

Prompt #014 adds the Certificate Engine foundation for immutable certificate issuance, learner self-service, public-safe verification and lifecycle evidence.

## Database

The additive migration is `supabase/migrations/20260706000400_certificate_engine.sql`.

It creates the canonical certificate tables:

- `certificate_templates`
- `certificate_template_versions`
- `certificate_eligibility_records`
- `certificates`
- `certificate_status_events`
- `certificate_verification_events`

It also creates the public-safe `certificate_public_views` projection.

Published template versions reject update/delete. Issued certificates reject update/delete except for the derived `current_status` pointer written by server-side status-event functions. Eligibility records, status events and verification events are append-only.

## RPCs

Controlled RPCs own the lifecycle:

- `issue_certificate`
- `verify_certificate`
- `download_certificate`
- `record_certificate_download`
- `revoke_certificate`
- `record_verification_event`

Application code must not use service-role shortcuts for certificate operations.

## UI

Implemented routes:

- `/student/certificates`
- `/student/certificates/[certificateId]`
- `/certificate/verify/[verificationCode]`

The public verification route displays only holder display name, course title, issuer name, issue date, expiry date and status.

## Non-Goals

This wave does not implement badges, achievements, hiring, email sending, PDF generation, blockchain, Open Badge, wallets or AI certificate generation.
