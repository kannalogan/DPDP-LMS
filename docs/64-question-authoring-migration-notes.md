# Question Authoring Migration Notes

## Migration

`supabase/migrations/20260706000800_question_authoring_cms.sql`

## Additive Tables

The migration adds authoring-only tables for question drafts, tags, categories, collections, imports, templates, section-question builders, review assignments, media, assets, publications, workflow state, authoring events, and change logs.

It reuses existing assessment runtime tables.

## RLS

RLS is enabled and forced on every new table. Authenticated reads require organization-scoped authoring permissions. Writes are exposed through controlled RPCs only.

## Immutability

Mutation rejection triggers protect:

- `question_publications`
- `assessment_authoring_events`
- `question_change_logs`

## Validation

Run:

```sh
npm run db:check
supabase db reset
```
