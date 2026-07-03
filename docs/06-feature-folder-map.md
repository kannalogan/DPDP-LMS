# Feature-First Folder Map

## Target Structure

Directories are created when their first production artifact exists; empty implementation scaffolds are not required by this document.

```text
app/
  (auth)/
  (student)/
  (mentor)/
  (admin)/
  (enterprise)/
  (career)/
  api/
    v1/
    webhooks/
  certificates/verify/
  error.tsx
  global-error.tsx
  layout.tsx
  not-found.tsx
components/
  ui/
  layout/
  feedback/
features/
  auth/
  organizations/
  rbac/
  learning-catalog/
  learning-delivery/
  assessments/
  certificates/
  mentoring/
  discussions/
  notifications/
  ai/
  career/
  compliance/
  billing/
  developer-platform/
  analytics/
hooks/
lib/
  api/
  config/
  observability/
  security/
  supabase/
  utils/
services/
  ai/
  billing/
  email/
  sms/
  storage/
  webhooks/
types/
database/
  migrations/
  seeds/
  tests/
supabase/
  config.toml
  functions/
docs/
tests/
  unit/
  integration/
  e2e/
```

## Folder Ownership Rules

| Folder                        | Purpose and owner                       | Belongs here                                                                                               | Must not be placed here                                                 |
| ----------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `app/`                        | Web delivery owned by frontend/platform | App Router layouts/pages, loading/error boundaries, Route Handlers and thin Server Action adapters         | Domain rules, provider SDK orchestration, reusable feature internals    |
| `app/(auth)/`                 | Identity experience                     | Sign-in/recovery/MFA route composition when Phase 2 begins                                                 | Supabase credential logic or role policy definitions                    |
| `app/(student)/`              | Student navigation boundary             | Student pages composed from feature exports                                                                | Student business rules or database access copied into pages             |
| `app/(mentor)/`               | Mentor navigation boundary              | Assigned-cohort pages                                                                                      | Broad learner queries or role checks only in UI                         |
| `app/(admin)/`                | Scoped administration delivery          | Organization/content/compliance admin route composition                                                    | A monolithic “admin can do everything” service                          |
| `app/api/`                    | HTTP boundary owned by platform/API     | Versioned API, webhooks, streams and public-safe endpoints                                                 | Repositories, raw secrets, unversioned external contracts               |
| `components/ui/`              | Design-system owner                     | shadcn/ui primitives, tokens and accessibility-tested wrappers                                             | Domain names, data fetching or feature workflows                        |
| `components/layout/`          | Application-shell owner                 | Navigation, page frames and responsive layout primitives                                                   | Feature-specific dashboards or authorization logic                      |
| `components/feedback/`        | Shared UX owner                         | Error, empty, loading and status primitives                                                                | Domain-specific messages without feature ownership                      |
| `features/<name>/`            | Named domain team                       | Actions, queries, schemas, services, policies, components, local hooks/types/tests for one bounded context | Other feature internals, generic utilities or vendor SDK initialization |
| `features/<name>/actions/`    | Feature                                 | Thin Server Actions mapping validated commands to services                                                 | Complex transactions or direct service-role use                         |
| `features/<name>/queries/`    | Feature                                 | RLS-aware read projections and cache metadata                                                              | Mutations or cross-tenant analytics scans                               |
| `features/<name>/services/`   | Feature                                 | Domain orchestration, state transitions and exported contracts                                             | UI state and provider-specific details                                  |
| `features/<name>/schemas/`    | Feature                                 | Zod command/query/result schemas                                                                           | Database-generated types edited by hand                                 |
| `features/<name>/components/` | Feature frontend                        | Domain-specific, accessible UI used by that feature                                                        | Generic buttons/forms or direct database clients                        |
| `hooks/`                      | Frontend platform                       | Truly cross-feature React hooks such as media/accessibility primitives                                     | Server code, feature-specific hooks or data access                      |
| `lib/`                        | Platform engineering                    | Stable cross-cutting runtime utilities with no business ownership                                          | Course/assessment/privacy rules or vendor workflow logic                |
| `lib/supabase/`               | Platform/data                           | Browser/server client factories and generated database types                                               | Feature queries or a casually exported service-role client              |
| `lib/security/`               | Security engineering                    | Headers, origin validation, sanitization, rate-limit interfaces, cryptographic helpers                     | Role-specific product policy                                            |
| `lib/observability/`          | Reliability                             | Structured logging, tracing and metrics interfaces                                                         | Raw PII payload logging                                                 |
| `services/`                   | Integrations team                       | Typed provider-neutral contracts and vendor adapters                                                       | Domain decisions about when to email, charge or invoke AI               |
| `services/ai/`                | AI platform                             | OpenAI/Claude/Gemini adapters, capability normalization                                                    | Tutor/assessment prompts or learner authorization                       |
| `services/billing/`           | Commerce integration                    | Stripe/Razorpay adapters and signature utilities                                                           | Internal entitlement policy                                             |
| `types/`                      | Architecture/platform                   | Small cross-feature contracts and generated shared database types                                          | A dumping ground for feature-local interfaces                           |
| `database/migrations/`        | Data engineering                        | Ordered immutable Supabase/PostgreSQL migrations after approval                                            | Draft SQL, seed data or edited applied migrations                       |
| `database/seeds/`             | Data engineering                        | Deterministic local/test reference data, never fake production users                                       | Production content migration or secrets                                 |
| `database/tests/`             | Data/security                           | pgTAP/schema/RLS tests                                                                                     | Browser tests                                                           |
| `supabase/functions/`         | Platform/integrations                   | Independently deployable Edge Functions and shared function runtime code                                   | Core UI, broad CRUD APIs or duplicated feature rules                    |
| `docs/`                       | Architecture/product/security           | Decision records, blueprints, standards and runbooks                                                       | Generated build output                                                  |
| `tests/unit/`                 | Feature owners                          | Fast pure module tests not colocated by convention                                                         | Live provider calls                                                     |
| `tests/integration/`          | Data/platform                           | Supabase, RLS, route and adapter integration tests                                                         | Full browser journeys                                                   |
| `tests/e2e/`                  | QA/product teams                        | Playwright critical user journeys                                                                          | Unit-level combinatorial cases                                          |

## Feature Internal Contract

Features may expose a public `index.ts`, but server-only and client exports are separated to prevent accidental bundling. A recommended production feature evolves as needed:

```text
features/assessments/
  actions/submit-attempt.ts
  components/...
  policies/can-start-attempt.ts
  queries/get-attempt.ts
  schemas/submit-attempt.ts
  services/submit-attempt.ts
  types/...
  index.ts
  server.ts
```

`index.ts` contains client-safe exports. `server.ts` imports `server-only` and exposes server queries/actions. Deep imports across feature boundaries are forbidden by lint rule once features exist.

## Ownership And Dependency Direction

```text
app -> features -> services/lib
features -> own internals + another feature's public contract
services -> vendor SDKs + lib
lib -> framework/runtime primitives only
database -> independent schema contract
```

Provider adapters never import `app` or feature UI. Shared UI never imports features. Circular feature dependencies are resolved through an orchestration service or durable event, not a shared catch-all folder.

## Naming

- Folders/files use kebab-case; React components and exported types use PascalCase; functions/variables use camelCase.
- Commands use verbs (`submitAttempt`); queries use `get/list/find`; durable events use past tense.
- Database tables/columns are plural snake_case; API JSON is camelCase.
- Avoid `common`, `misc`, `helpers`, `manager` and `utils` inside features unless the name communicates one responsibility.

## Enforcement

Add import-boundary linting when the first production features are implemented. Pull requests must identify owning feature, public contract changes, data/RLS changes and required architecture decision records. Folder creation alone is not architecture compliance; ownership and dependency direction are.
