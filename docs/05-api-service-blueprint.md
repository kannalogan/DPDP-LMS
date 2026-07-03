# API And Service Blueprint

## Boundary Rules

- React Server Components read server-safe projections directly through feature queries using the request-scoped Supabase server client.
- Server Actions execute authenticated, same-origin user commands initiated by SYRA UI.
- Route Handlers expose public endpoints, external APIs, webhooks, streaming responses and file/download handshakes.
- Supabase Edge Functions handle verified provider callbacks, schedules and short asynchronous workloads needing a globally reachable endpoint.
- Durable domain state remains PostgreSQL-backed. Provider queues, callbacks and retries never become the sole system of record.
- Every command validates input, tenant, permission, state transition and idempotency before mutation.

## Runtime Placement Matrix

| Work                                     | Boundary                                              | Reason                                                                    |
| ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Render enrolled course list              | Server Component query                                | Private server read with RLS; no client waterfall                         |
| Save note/bookmark                       | Server Action                                         | Authenticated same-origin mutation with immediate revalidation            |
| Submit assessment                        | Server Action calling transactional database function | Atomic expiry, attempt state, response freeze and audit                   |
| Public certificate verification          | Route Handler                                         | Anonymous rate limit, exact-token lookup and controlled caching           |
| Developer API                            | Versioned Route Handlers                              | Stable HTTP contract, API-key auth and quotas                             |
| Stripe/Razorpay webhook                  | Route Handler or Edge Function                        | Raw-body signature validation and idempotent reconciliation               |
| Resend/MSG91 delivery callback           | Edge Function candidate                               | Public callback, signature verification and fast acknowledgement          |
| AI tutor stream                          | Route Handler                                         | Streaming response, cancellation, policy enforcement and usage accounting |
| Certificate expiry/retention scan        | Scheduled Edge Function                               | Short schedule trigger that claims durable jobs                           |
| Bulk enrollment/report generation        | Durable `background_jobs` + Edge Function worker      | Retryable work beyond request lifetime                                    |
| Realtime discussion/notification updates | Supabase Realtime                                     | Authorized low-latency table changes                                      |

## Feature Service Shape

Each `features/<feature>` exports only deliberate boundaries:

```text
features/certificates/
  actions/       UI command adapters
  queries/       RLS-backed read projections
  schemas/       Zod input/output contracts
  services/      domain orchestration and transitions
  policies/      application-level permission explanations
  types/         feature-local domain types
  index.ts       approved public exports
```

Repositories are optional and feature-local. They accept an injected Supabase client/transaction context and never create privileged clients themselves.

## Supabase Client Separation

| Client                    | Location                  | Credential                            | Allowed use                                                                               |
| ------------------------- | ------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Browser client            | `lib/supabase/browser.ts` | publishable/anon key + user session   | RLS-protected browser reads, Realtime and Storage uploads explicitly designed for clients |
| Server request client     | `lib/supabase/server.ts`  | publishable/anon key + cookie session | Server Components, Actions and Route Handlers under user RLS                              |
| Privileged service client | future server-only module | service-role secret                   | Verified webhooks and controlled workers only; never imported by client-capable modules   |

Server-only modules use `server-only`; environment schemas separate public and secret variables; logs redact credentials, tokens, raw webhook bodies and PII.

## Server Action Contract

Every action follows this sequence:

1. Parse a versioned Zod command schema.
2. Resolve session and active tenant membership server-side.
3. Check feature permission and resource state for a useful denial reason.
4. Call an RLS-backed query or transactional PostgreSQL function.
5. Attach idempotency key for retryable commands.
6. Emit audit/domain events in the transaction where evidence is required.
7. Revalidate exact cache tags/paths after commit.
8. Return a discriminated result containing safe field errors or a typed error code; never provider/database details.

Actions are thin adapters. Assessment scoring, certificate eligibility, consent transitions and PII reveal authorization live in domain services/database functions.

## Route Handler Surface

| Route family                                  | Authentication                                   | Contract                                                                   |
| --------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `/api/health`, `/api/ready`, `/api/version`   | Operational policy                               | Existing liveness/readiness/version responses; no secrets                  |
| `/api/v1/*`                                   | Hashed API key or OAuth-equivalent future client | Versioned developer API, cursor pagination, quotas and deprecation headers |
| `/api/webhooks/stripe`                        | Stripe signature over raw body                   | Deduplicate event ID, reconcile internal subscription, acknowledge fast    |
| `/api/webhooks/razorpay`                      | Razorpay signature over raw body                 | Same provider-neutral reconciliation contract                              |
| `/api/webhooks/resend`, `/api/webhooks/msg91` | Provider signature/allowlisted callback policy   | Update delivery attempt only                                               |
| `/api/certificates/verify/:token`             | Anonymous exact token                            | Minimal public projection, anti-enumeration rate limit                     |
| `/api/ai/:engine/stream`                      | User session + tenant entitlement                | Policy, consent, context authorization, streaming and usage finalization   |
| `/api/storage/*`                              | User/API client                                  | Signed upload/download grant after parent-resource authorization           |

The token route must avoid access-log leakage; production infrastructure should redact path parameters or prefer a POST body when provider/tooling cannot guarantee this.

## API Standards

- JSON uses camelCase externally and explicit mapping to snake_case database fields.
- Success envelopes contain `data` and optional `meta`; errors contain stable `code`, safe `message`, `requestId` and optional field `details`.
- Collection reads use opaque cursor pagination with deterministic `(created_at,id)` or domain-specific ordering.
- Mutating developer API calls require `Idempotency-Key`; reuse with a different request hash returns conflict.
- Timestamps are ISO-8601 UTC; dates remain `YYYY-MM-DD`; money is minor units plus currency.
- Unknown fields are rejected for commands. Responses are schema-tested to prevent accidental PII expansion.
- Breaking API changes require a new major path; additive fields require consumer-tolerant contracts and changelog entries.

## Transaction And Event Pattern

Critical commands call PostgreSQL functions that atomically mutate state and append audit/domain facts. An outbox-compatible durable event record is claimed by workers after commit. Delivery is at least once, so consumers deduplicate by event ID and version. Events never carry secrets, complete assessment answers or unredacted PII.

## Provider Abstractions

### AI

`AIProvider` exposes model capabilities, streaming/non-streaming generation, structured output and usage metadata. `AIEngine` owns purpose-specific context, prompt version, safety, redaction and output validation. Provider fallback is permitted only when data-region, model capability and risk policy match; fallback is recorded.

### Notifications

`NotificationChannel` accepts a rendered, versioned delivery request and returns provider ID/status. Implementations are `ResendEmailChannel`, `MSG91SmsChannel` and in-app persistence. Domain features create notification intents, never call providers directly.

### Billing

`BillingProvider` maps catalog/customer/subscription identifiers and verifies events. Stripe and Razorpay adapters normalize into internal payment/subscription events. Provider webhooks are authoritative for payment completion; the browser redirect is not.

### Storage

Feature services request `StorageGrant` for a classified parent resource. The storage service validates file type/size, generates tenant-prefixed object paths, returns short-lived signed operations and records metadata/hash after completion.

## Webhook Strategy

1. Read raw body with a strict size limit.
2. Verify timestamped signature before parsing business fields.
3. Persist/deduplicate provider event ID and payload hash.
4. Return success for already processed events.
5. Record a durable processing job and acknowledge within provider timeout.
6. Reconcile by fetching provider state when event ordering is uncertain.
7. Retry transient failures with exponential backoff and jitter; terminal failures enter an operator queue.
8. Provide audited replay that reuses the original event ID and never duplicates domain transitions.

## Realtime Channels

| Use case                     | Source/channel                                | Payload rule                                     |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------ |
| In-app notification count    | `notifications` changes filtered to recipient | IDs/status only; fetch details under RLS         |
| Course/cohort discussion     | authorized discussion table changes           | Safe post projection; moderation status enforced |
| Mentor alert queue           | `risk_signals` for active assignment          | Signal ID/severity; details fetched under RLS    |
| Assessment processing status | attempt/evaluation projection                 | Status only; no answer keys or other learners    |
| Bulk job progress            | tenant-scoped job projection                  | Counts/status/error code, no raw input rows      |

Realtime is not used for billing authority, audit delivery, consent enforcement or final assessment submission.

## Caching And Performance

- Public catalog and public certificate projections may use bounded CDN caching with surrogate keys and revocation invalidation.
- Private user/tenant reads default to `private, no-store` unless cache keys include identity/tenant and invalidation is proven.
- Published immutable course/lesson versions use cache tags by version ID.
- Search and analytics use projections, not synchronous scans over event tables.
- Redis is a future optimization for rate limits/cache, not a source of truth; the initial implementation uses PostgreSQL-backed controls or provider infrastructure.

## Failure Semantics

- Validation: `400`; unauthenticated: `401`; unauthorized: `403`; absent or intentionally concealed: `404`; state/idempotency conflict: `409`; expired policy window: `410` or stable domain conflict; rate limit: `429`; provider dependency unavailable: `503` with retry policy.
- Errors map to the existing typed API foundation and structured logger.
- Retriable calls use bounded exponential backoff with jitter and honor provider retry headers.
- Correlation IDs cross Route Handler, database event, provider call and webhook reconciliation.

## Edge Function Candidates

Approved candidates are notification dispatch, verified delivery callbacks, payment webhook ingestion, scheduled certificate expiry, privacy-retention job orchestration, report generation workers and webhook delivery workers. AI streaming stays in a Next.js Route Handler unless provider/runtime constraints justify an Edge Function. Core interactive authorization and CRUD do not move to Edge Functions merely for novelty.

## Contract Testing

- Zod schema tests for action/route inputs and safe outputs.
- RLS integration tests using user JWTs from every role and a second tenant.
- Provider adapter contract suites with signed fixtures and replay/out-of-order events.
- Webhook idempotency and reconciliation tests.
- Streaming cancellation/usage finalization tests.
- OpenAPI generation/checks for `/api/v1` before external release.
