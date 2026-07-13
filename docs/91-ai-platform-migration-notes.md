# AI Platform Migration Notes

Migration `20260706001400_ai_platform.sql` adds 26 AI-owned tables, six security-invoker projections, 14 controlled RPCs, forced RLS, immutable evidence triggers, and three AI permission keys.

## Deployment

1. Run `npm run db:check` and verify the pinned migration checksum and AI inventory.
2. Reset an isolated local Supabase stack with `supabase db reset`.
3. Run pgTAP, including `015_ai_platform_test.sql`.
4. Regenerate database types when the configured local runtime is available.
5. Leave providers, models, capabilities, workflows, prompts, and guardrails empty until organization administrators configure metadata through controlled RPCs.

The migration contains no business seed data, credentials, provider SDK configuration, API endpoints, external calls, vector types, embeddings, or destructive schema operations. Direct table writes are revoked; application writes use controlled RPCs.
