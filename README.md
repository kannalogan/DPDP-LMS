# SYRA Learning Platform

SYRA is an enterprise AI-first learning platform for compliance, privacy, security, and custom enterprise training. DPDP compliance is the first learning track, but the architecture is reusable across future domains.

## Stack

- Next.js 15 and React 19
- TypeScript with strict compiler settings
- Tailwind CSS v4
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Vercel deployment target

## Engineering Foundation

- Strict TypeScript, ESLint, Prettier, Commitlint, Husky, and lint-staged
- Environment validation for development, testing, staging, and production
- GitHub Actions for lint, typecheck, format, unit test, build, and artifact upload
- Security headers, typed API errors, structured logging, retry utilities, and rate-limit hooks
- Health, readiness, and version endpoints
- Vitest and Playwright infrastructure without fake tests

## Getting Started

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run typecheck
npm run format
npm run test
npm run build
```

## Documentation

### Product And Data Architecture

- [Source audit](docs/00-source-audit.md)
- [Master product map](docs/01-master-product-map.md)
- [Module map](docs/02-module-map.md)
- [Database blueprint](docs/03-database-blueprint.md)
- [RLS and security model](docs/04-rls-security-model.md)
- [API and service blueprint](docs/05-api-service-blueprint.md)
- [Feature-first folder map](docs/06-feature-folder-map.md)
- [Implementation roadmap](docs/07-implementation-roadmap.md)
- [AI engine blueprint](docs/08-ai-engine-blueprint.md)
- [DPDP compliance blueprint](docs/09-compliance-dpdp-blueprint.md)
- [Open risks and decisions](docs/10-open-risks-and-decisions.md)

### Master Engine Architecture

- [Master engine architecture](docs/11-master-engine-architecture.md)
- [Engine boundary rules](docs/12-engine-boundary-rules.md)
- [Event catalog](docs/13-event-catalog.md)
- [Workflow catalog](docs/14-workflow-catalog.md)
- [Engine-to-database map](docs/15-engine-to-database-map.md)
- [Engine-to-UI map](docs/16-engine-to-ui-map.md)
- [Engine-to-AI map](docs/17-engine-to-ai-map.md)
- [Engine security rules](docs/18-engine-security-rules.md)
- [Engine testing strategy](docs/19-engine-testing-strategy.md)
- [Engine implementation sequence](docs/20-engine-implementation-sequence.md)

### Master Database Contract

- [Master database contract](docs/21-master-database-contract.md)
- [Master enum catalog](docs/22-master-enum-catalog.md)
- [Master table catalog](docs/23-master-table-catalog.md)
- [Database relationship map](docs/24-database-relationship-map.md)
- [PostgreSQL design standards](docs/25-postgres-design-standards.md)
- [Supabase design standards](docs/26-supabase-design-standards.md)
- [Search and index strategy](docs/27-search-and-index-strategy.md)
- [Database security matrix](docs/28-database-security-matrix.md)
- [Database performance strategy](docs/29-database-performance-strategy.md)
- [Database open decisions](docs/30-database-open-decisions.md)

### Engineering Standards

- [Architecture summary](ARCHITECTURE.md)
- [Extended architecture](docs/architecture.md)
- [Current folder guide](docs/folders.md)
- [Developer onboarding](docs/development/onboarding.md)
- [Environment standard](docs/standards/environment.md)
- [Security standard](docs/standards/security.md)
- [Performance standard](docs/standards/performance.md)
- [Accessibility standard](docs/standards/accessibility.md)
