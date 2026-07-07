# Certificate Migration Notes

## Migration

`20260706000400_certificate_engine.sql` is additive and depends on the identity, learning, delivery and assessment waves.

## Safety Rules

- No destructive certificate migration is allowed without a new ADR.
- No certificate migration may add public access to `certificates`.
- Public verification must go through the exact-token projection/RPC.
- Issued certificate rows are immutable production artifacts.
- Revocation and expiry append `certificate_status_events`.
- Download and verification telemetry append `certificate_verification_events`.

## Validation

Run:

```sh
npm run db:check
supabase db reset
npm test
npm run build
```
