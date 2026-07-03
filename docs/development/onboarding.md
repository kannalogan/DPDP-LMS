# Developer Onboarding

## Prerequisites

- Node.js 22+
- npm 10+
- Supabase project access when working beyond local foundation tasks
- Vercel access for deployment work

## First Run

```bash
cp .env.development.example .env.local
npm install
npm run dev
```

## Daily Workflow

```bash
npm run lint
npm run typecheck
npm run test
```

Use `npm run format:write` to apply formatting.

## Environments

- Development: local `.env.local`
- Testing: deterministic test values from `.env.testing.example`
- Staging: Vercel preview environment with staging Supabase
- Production: Vercel production environment with production Supabase

Secrets belong in Vercel or Supabase secret stores, never in git.
