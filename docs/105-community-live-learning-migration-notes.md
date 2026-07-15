# Community and Live Learning Migration Notes

Migration `20260706001700_community_live_learning.sql` is additive and contains no business seed data. It creates organization-scoped communication entities, seven safe projections, controlled RPCs, indexes, forced RLS, column-restricted grants for sensitive tables, and immutable evidence triggers.

Run `npm run db:check` before migration replay. A clean local Supabase runtime must apply the migration with `supabase db reset`. Provider accounts are configuration metadata only and must never receive credentials.
