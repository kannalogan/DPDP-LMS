# Mentor Migration Notes

`20260706000500_mentor_workspace.sql` is additive and depends on identity, learning, assessment and certificate foundations.

## Safety Rules

- Mentor access is assignment scoped.
- Learners cannot access mentor tables.
- Mentor projections must expose only learner-safe progress, assessment and certificate summaries.
- No destructive mentor migration is allowed without a new ADR.
- No business seed data is allowed.

## Validation

Run:

```sh
npm run db:check
supabase db reset
npm test
npm run build
```
