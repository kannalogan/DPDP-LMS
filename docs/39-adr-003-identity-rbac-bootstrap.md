# ADR-003: Identity And RBAC Bootstrap

- **Status:** Accepted
- **Date:** 2026-07-04
- **Decision owners:** Architecture, Security, Identity, Authorization
- **Contract:** Frozen Prompt #001-#007 architecture and `docs/21` through `docs/38`
- **Resolves:** DB-010 for the Identity Platform permission surface

## Decision

1. Add the five remaining frozen identity tables: `user_settings`, `user_sessions`, `devices`, `organization_invitations`, and `organization_settings`.
2. Seed deployment-owned system role and permission registries in a checksum-pinned migration. These are production reference keys defined by the frozen enum catalog, not demo users, tenant data, or business content.
3. Resolve authorization from current database state through protected, search-path-pinned functions. JWT claims never replace membership and assignment checks.
4. Create profiles idempotently from `auth.users`; Supabase Auth remains credential and session authority.
5. Use a validated, HttpOnly `syra-organization-id` cookie only as a tenant selection hint. Every server operation and RLS policy revalidates active membership.
6. Keep service-role use isolated to a server-only admin-client factory. Interactive identity actions use the caller's RLS-scoped client.
7. Model remember-me as cookie persistence preference without changing refresh-token authority or storing tokens in application tables.

## Reference Registry

The migration adds the frozen role keys and the minimum identity capabilities required for profile, organization, membership, invitation, role, assignment, and platform authorization. Registry changes remain additive and require contract/security review.

## Consequences

- Identity flows can be implemented without client-side authorization authority.
- Organization creation and invitation acceptance are atomic protected database functions.
- Final enterprise SSO, MFA enrollment, SCIM, verified domains, support access, and platform administration remain future frozen-contract waves.
- Existing legacy membership columns remain compatibility debt under ADR-002 and are never read by the new resolver.
