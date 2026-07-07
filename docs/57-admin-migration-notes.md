# Admin Migration Notes

`20260706000600_admin_workspace.sql` is additive and depends on the trust foundation and identity/RBAC waves.

## Safety Rules

- Admin writes must use controlled RPCs.
- Organization administrators are scoped to their organization.
- Platform administrators do not receive service-role behavior.
- Dashboard events and usage snapshots are append-only.
- No business seed data is allowed.

## Validation

Run:

```sh
npm run db:check
supabase db reset
npm test
npm run build
```
