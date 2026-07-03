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

- `ARCHITECTURE.md`
- `docs/ARCHITECTURE.md`
- `docs/folders.md`
- `docs/development/onboarding.md`
- `docs/standards/environment.md`
- `docs/standards/security.md`
- `docs/standards/performance.md`
- `docs/standards/accessibility.md`
