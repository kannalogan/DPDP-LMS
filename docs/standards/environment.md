# Environment Strategy

## Environment Classes

- Development: local engineering work.
- Testing: deterministic CI and automated tests.
- Staging: Vercel preview deployments connected to non-production Supabase resources.
- Production: customer-facing environment.

## Rules

- `NEXT_PUBLIC_` values are visible to browsers.
- Provider API keys, service role keys, and webhooks are server-only.
- Missing required environment values are reported by `/api/ready`.
- Runtime code that requires validated values should call `getEnv()`.
- Optional integrations must degrade explicitly until configured.
