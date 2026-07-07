# Course Authoring Migration Notes

## Migration

`supabase/migrations/20260706000700_course_authoring_cms.sql`

## Additive Tables

The migration adds authoring-only tables for drafts, reviews, publication evidence, resource library records, workflow state, editor preferences, locks, and publishing jobs.

It does not recreate canonical learning tables.

## RLS

RLS is enabled and forced on every new table. Authenticated users can read authoring data only when they have an authoring-capable permission in the active organization.

Writes are not exposed as table policies. They are performed through security-definer RPCs with permission checks.

## Immutability

The migration installs mutation rejection triggers on:

- `course_publications`
- `publishing_events`
- `version_change_logs`

## Validation

Run:

```sh
npm run db:check
supabase db reset
```

The checker validates table inventory, controlled RPCs, RLS posture, immutable evidence triggers, and reuse of canonical learning tables.
