# Security Policy

## Supported Versions

Security fixes target the latest `main` branch until formal release channels are introduced.

## Reporting a Vulnerability

Do not open public issues for vulnerabilities. Report privately to the repository owner with:

- Impacted area
- Reproduction steps
- Evidence such as request IDs, logs, or screenshots
- Suggested severity

## Baseline Controls

- Supabase Row Level Security is required for exposed tables.
- Secrets must stay in server-only environment variables.
- `NEXT_PUBLIC_` variables are considered browser-visible.
- Service role keys must never be used in client components or middleware.
- Security headers are applied from `middleware.ts`.
- Audit logging hooks should be added before sensitive administrative workflows ship.
