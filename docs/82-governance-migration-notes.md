# Governance Migration Notes

Migration `20260706001200_governance_compliance_platform.sql` adds 37 governance, audit, policy, risk, retention, privacy, consent, and evidence tables; eight security-invoker projections; 19 controlled RPCs; forced RLS; and immutable history triggers. It contains no business seed data or destructive deletion.

## Deployment

1. Run `npm run db:check` and confirm the governance checker inventory.
2. Reset an isolated local Supabase stack with `supabase db reset`.
3. Run the pgTAP suite, including `013_governance_platform_test.sql`.
4. Review generated database types if the project type-generation runtime is available.
5. Promote the same immutable migration artifact through staging and production.

## Security notes

The migration revokes table access before granting authenticated read access controlled by forced RLS. RPC execution is revoked from `PUBLIC` and granted only to `authenticated`. Security-definer RPCs verify the current identity and organization permission before every write. Views use `security_invoker=true`.

Published controls and policies are immutable. Evidence versions, acknowledgements, risk reviews, approvals, retention events, privacy events and documents, consent withdrawals, and governance events reject updates and deletes.

## Rollback posture

This migration has no destructive rollback. If deployment must stop, disable application route promotion and preserve the additive schema for forensic review. Any destructive remediation requires a separate ADR and migration.
