# Folder Guide

## `app`

Next.js App Router routes, layouts, route handlers, error boundaries, and framework-owned files.

## `config`

Environment schemas, runtime detection, and configuration helpers.

## `components`

Shared UI components once the design system is introduced.

## `features`

Feature-owned business logic. Each feature should own its forms, hooks, schemas, server actions, and components unless a piece is truly shared.

## `services`

Integration contracts and clients for APIs, providers, billing, messaging, and future internal service boundaries.

## `lib`

Cross-cutting utilities such as logging, security, API errors, retries, formatting, and low-level framework helpers.

## `hooks`

Shared React hooks that are not owned by a single feature.

## `types`

Shared TypeScript types used across multiple boundaries.

## `database`

Supabase and PostgreSQL migrations, database docs, generated types, and seed strategy.

## `tests`

Test infrastructure split by execution mode. Unit tests belong in `tests/unit`; browser tests belong in `tests/e2e`.
