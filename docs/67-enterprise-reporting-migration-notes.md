# Enterprise Reporting Migration Notes

Migration 20260706000900_enterprise_reporting.sql is additive and has no business seed data. It creates 21 reporting tables, 12 read-only projections, controlled RPCs, forced RLS and append-only evidence triggers.

Apply after the Question Authoring migration. Validate with npm run db:check; local runtime validation uses supabase db reset and requires Docker plus local Supabase credentials configured through the existing environment examples.
