# SYRA Architecture

This document extends the architecture summary in `docs/architecture.md`.

## Non-Negotiables

- DPDP is one learning track, not the architecture boundary.
- Multi-tenancy is organization scoped.
- Authorization belongs in database policies and server-side guards, not client-only checks.
- Provider integrations are isolated behind service and feature modules.
- Feature-first folders remain the default organization model.

## Runtime Layers

- `app`: Next.js App Router entrypoints, route handlers, and app-level boundaries.
- `features`: domain-owned application logic.
- `services`: integration clients and cross-domain service contracts.
- `lib`: shared infrastructure utilities.
- `config`: environment and runtime configuration.
- `database`: migrations and database documentation.
- `types`: shared TypeScript contracts.

## Operational Endpoints

- `/api/health`: process liveness.
- `/api/ready`: deploy readiness and required environment checks.
- `/api/version`: deployed version and commit metadata.
