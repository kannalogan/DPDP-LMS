# AI Learning Assistant Migration Notes

Migration `20260706001600_ai_learning_assistant.sql` adds 20 tenant-scoped learning tables, five security-invoker projections, supporting indexes, immutable evidence triggers, forced RLS, and controlled RPCs.

The migration is additive. It reuses organizations, profiles, courses, modules, lessons, AI conversations, AI messages, execution requests, Prompt #025 authorization helpers, and mentor assignment authorization. It does not add providers, credentials, seed content, vector search, or direct provider execution.

Validate with `npm run db:check`, `supabase db reset`, `supabase test db`, and `npm test` before promotion.
