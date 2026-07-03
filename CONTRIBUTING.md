# Contributing

SYRA is maintained as a production SaaS platform. Every change should preserve tenant isolation, strict typing, accessibility, and operational clarity.

## Local Setup

1. Use Node.js 22 or newer.
2. Copy `.env.development.example` to `.env.local`.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

## Required Checks

Run these before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run format
npm run test
npm run build
```

## Commit Style

Commits use Conventional Commits, enforced by Commitlint.

Examples:

- `feat: add organization invitation contract`
- `fix: harden readiness response`
- `chore: update ci cache policy`

## Engineering Standards

- Keep feature code inside feature-first boundaries.
- Never authorize from user-editable metadata.
- Do not expose service role keys or provider secrets to the browser.
- Add tests with real assertions when behavior is implemented.
- Keep UI accessible by default and conform to WCAG AA.
