# Supabase Design Standards

## Auth Contract

- Supabase Auth is credential/session authority. `profiles.id` references `auth.users.id`; passwords, factors and refresh tokens never enter `public` tables.
- Server Components/Actions/Route Handlers create request-scoped clients carrying the user session so RLS applies.
- Membership/permission is database-authoritative; JWT claims may cache low-volatility hints but never replace revocation-sensitive checks.
- Auth hooks create/link a minimal profile idempotently. Organization membership/consent are separate commands.
- `user_sessions` and `devices` are security observations, not competing session stores.
- Privileged users require approved MFA/assurance policy; step-up is checked on high-risk commands.

## RLS Contract

- Enable and force RLS on every exposed application table before data insertion.
- Browser/server publishable-key clients see only policies for their role/session. Secret/service clients are isolated to workload-specific Edge Functions/workers.
- Policy helpers are stable, indexed, recursion-tested, search-path pinned and return booleans rather than privileged rows.
- `WITH CHECK` prevents moving rows between tenants or forging owner IDs.
- Storage policies and application metadata authorization both succeed before object access.
- Full table classes and role matrix are in `docs/28-database-security-matrix.md`.

## Storage Contract

Buckets are design contracts only; Prompt #005 does not create them.

| Bucket             | Visibility                         | Owners/content                              | Access and retention                                                       |
| ------------------ | ---------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| `avatars`          | Private by default; signed display | Profile avatars                             | self write, authorized readers; R1                                         |
| `learning-assets`  | Private                            | Published/draft course resources, templates | entitlement/author scope; parent R10                                       |
| `submissions`      | Private                            | Assignment artifacts                        | learner before submit, evaluator after; R2                                 |
| `certificates`     | Private                            | Generated certificate artifacts             | holder/credential staff; public verification never exposes bucket path; R3 |
| `reports`          | Private                            | Generated operational reports               | requester/scoped admin, short signed URL; 30d                              |
| `evidence`         | Private/high sensitivity           | Audit/compliance exports                    | explicit compliance permission, download audit; R4                         |
| `career-documents` | Private/high sensitivity           | Resumes/portfolio artifacts                 | candidate and purpose-authorized users; R1                                 |
| `ai-media`         | Private/ephemeral                  | Voice/image inputs where approved           | session/purpose consent; R7 or shorter                                     |

Supabase Storage denies uploads without policies and enforces access through RLS on `storage.objects`; service keys bypass those controls and therefore remain workload-only. Policies validate bucket, tenant-prefixed object path, parent authorization, operation, MIME/size and owner. See official [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Object path format: `<organization-or-global>/<classification>/<owner-aggregate>/<uuid>/<safe-filename>`. User filenames never determine authorization. `storage_objects` records the canonical path, checksum, classification, scan state and parent lifecycle.

## Realtime Contract

Exactly 12 tables are initially approved:

1. `assessment_attempts` - learner/evaluator status only.
2. `evaluations` - released/review state only.
3. `certificate_status_events` - safe status invalidation.
4. `risk_signals` - assigned mentor queue.
5. `notifications` - recipient inbox/count.
6. `announcements` - eligible audience updates.
7. `discussion_threads` - authorized forum updates.
8. `discussion_posts` - authorized new/edited posts.
9. `discussion_reactions` - authorized reaction counts.
10. `applications` - candidate/partner/TPO safe stage projection.
11. `background_jobs` - requester-safe job status, preferably server Broadcast at scale.
12. `workflow_instances` - operator/requester-safe status, preferably server Broadcast at scale.

Realtime payloads contain IDs/status/minimized fields; clients fetch details under RLS. Presence/Broadcast never carries assessment answers, PII, secrets or audit evidence.

Postgres Changes performs authorization per subscriber and processes changes serially to preserve order; high fan-out can become a database bottleneck. Benchmark every channel and move fan-out status to server-side Broadcast when required. Delete events are not relied upon for filtered authorization. See official [Realtime Postgres Changes guidance](https://supabase.com/docs/guides/realtime/postgres-changes).

## Edge Function Ownership

| Function class                | Owning engines            | Auth mode                       | Responsibilities                                            |
| ----------------------------- | ------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Payment webhooks              | Payment/Webhook           | signed raw webhook, no user JWT | verify, durable receipt, enqueue reconciliation             |
| Delivery callbacks            | Notification/Webhook      | provider signature/secret       | map provider outcome only                                   |
| Outbound webhook worker       | Webhook/Workflow          | workload secret                 | claim, sign, deliver, retry                                 |
| Notification worker           | Notification/Workflow     | workload secret                 | consent recheck, render, deliver, record attempt            |
| Retention/rights worker       | Compliance/Workflow       | workload secret                 | claim approved action, legal-hold recheck, execute evidence |
| Certificate expiry/generation | Certificate/Workflow      | workload secret                 | claim job, generate/expire idempotently                     |
| Report/bulk worker            | Reporting/Cohort/Workflow | workload secret                 | bounded batch, progress and result manifest                 |
| User-invoked function         | owning feature            | user JWT                        | use RLS-scoped client; no automatic admin client            |

Edge Functions are Deno-compatible TypeScript functions appropriate for webhooks and third-party integration. User calls should carry user auth and preserve RLS; secret-auth workers receive narrowly named secrets. See official [Edge Functions](https://supabase.com/docs/guides/functions) and [function authentication](https://supabase.com/docs/guides/functions/auth).

## Cron Contract

Supabase Cron uses `pg_cron`. Jobs trigger short database functions or Edge Functions; they do not execute unbounded business work inside the scheduler. Official guidance recommends no more than eight concurrent jobs and no job longer than ten minutes, which SYRA treats as platform ceilings, not targets. See [Supabase Cron](https://supabase.com/docs/guides/cron).

Planned schedules:

- minute: claim due notification/webhook/workflow work if event-driven trigger is unavailable;
- hourly: certificate expiry discovery, stale job recovery and integration reconciliation;
- daily: retention due discovery, search-index repair, analytics aggregation and expired grant/token cleanup;
- weekly: partition/default checks, evidence integrity verification and report artifact cleanup;
- monthly: retention/consent policy review reminders and capacity statistics.

Every schedule has owner, idempotency key, timeout, lock, run telemetry, missed-run recovery and manual replay.

## Vault And Secrets

Supabase Vault encrypts secrets stored in PostgreSQL and can support database functions/webhooks. Environment/platform secret stores remain preferred for Next.js and Edge Function provider credentials. Vault is permitted only when a database-owned integration genuinely needs a secret; secret IDs/references may be stored in config, never decrypted values. Access is service-only and audited. See [Supabase Vault](https://supabase.com/docs/guides/database/vault).

## Database Webhooks

Direct database webhooks are not the domain event backbone. SYRA uses transactional `event_outbox` plus the Webhook engine so schemas, retries, privacy and replay remain controlled. A database webhook may wake a worker after commit but cannot carry unrestricted row payload or replace outbox evidence.

## Local, Staging And Production

- Supabase CLI/local stack versions are pinned and migration history is identical across environments.
- Seed data is deterministic reference/test data only; no fake production identities.
- Staging uses separate project/secrets/provider sandboxes and representative RLS/cardinality tests.
- Production changes run through CI migration plan, backup/PITR check, lock/backfill analysis and post-deploy verification.
- Storage object backup/recovery is designed separately from database backup.
