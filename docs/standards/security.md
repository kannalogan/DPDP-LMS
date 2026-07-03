# Security Standards

## Baseline

- Enforce RLS for all exposed Supabase tables.
- Validate inputs at API boundaries.
- Use typed application errors and structured logs.
- Apply security headers from middleware.
- Prepare rate limiting before public write endpoints ship.
- Never use user-editable metadata for authorization.
- Add audit logs before administrative or billing workflows ship.
