# Architecture

SYRA is a domain-neutral, multi-tenant learning platform. DPDP compliance is the first learning track, not the application boundary.

## Architecture Contract

- Next.js App Router owns route boundaries and API route handlers.
- Feature code lives in `features/*`.
- Cross-cutting infrastructure lives in `lib/*`.
- Runtime and environment configuration lives in `config/*`.
- Integration contracts live in `services/*`.
- Database migrations live in `database/migrations`.
- Shared TypeScript contracts live in `types/*`.

## Operational Foundations

- Health: `/api/health`
- Readiness: `/api/ready`
- Version: `/api/version`
- Security headers: `middleware.ts`
- Environment validation: `config/env.ts`
- Typed API errors: `lib/api/errors.ts`
- Structured logging: `lib/observability/logger.ts`

See `docs/ARCHITECTURE.md` for the extended engineering architecture.
