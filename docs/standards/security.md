# Security Standards

## Baseline

- Enforce RLS for all exposed Supabase tables.
- Validate inputs at API boundaries.
- Use typed application errors and structured logs.
- Apply security headers from middleware.
- Prepare rate limiting before public write endpoints ship.
- Never use user-editable metadata for authorization.
- Add audit logs before administrative or billing workflows ship.

## AI Execution Boundary

- Provider credentials remain in the deployment secret manager and never reach client code, PostgreSQL, logs, errors, analytics, or audit payloads.
- All provider calls use the controlled server execution service after identity, tenant, permission, policy, guardrail, routing, and budget checks.
- Store hash/count/classification evidence instead of prompt or response plaintext.
- Reject consequential AI actions and require authorized human workflows.
- Use explicit provider/region fallback rules; never silently route across policy boundaries.
- Return normalized safe errors with trace IDs and no raw provider response.
