# AI Provider Execution Migration Notes

Migration `20260706001500_ai_provider_execution.sql` is the single additive Prompt #025 wave under ADR-018.

It reuses Prompt #024 provider/model registries, capabilities, guardrails, usage limits, usage budgets, usage events, prompt versions, and workflows. It adds 14 execution-policy, route, health, resilience, cost, budget-reservation, and immutable evidence tables; five security-invoker projections; 13 controlled RPCs; forced RLS; tenant checks; and direct-write revocation.

No provider credential, prompt plaintext, response plaintext, business seed, SDK, or vendor-specific database entity is introduced.

Validation sequence:

```bash
npm run db:check
supabase db reset
supabase test db --local
npm test
```

The checksum is pinned in `database/migration-inventory.tsv`. Any post-acceptance change requires a new additive migration under the frozen migration policy.
