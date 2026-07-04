# Identity Platform Implementation

## Delivered Surface

Prompt #008 implements the production identity layer without LMS dashboards or business features:

- Supabase email/password registration, verification callback, sign-in, local sign-out and password recovery;
- SSR cookie refresh, verified-user resolution, guest/protected route handling and safe return paths;
- idempotent profile bootstrap, profile completion, accessibility/theme preferences and private avatar upload;
- organization creation, active membership validation, invitation acceptance, switching and HttpOnly tenant selection;
- deployment-owned system roles/permissions, scoped assignment resolution and server/client permission guards;
- CSRF origin preparation, request throttling hooks, session/device schema, audit events and immutable session evidence;
- responsive WCAG-oriented forms, loading states, errors, keyboard focus and screen-reader status regions.

## Database Wave

`20260704000200_identity_platform.sql` adds the five remaining frozen identity tables, protected authorization and command functions, RLS policies, column-level grants, Auth profile bootstrap, the private avatars bucket, reference RBAC rows and identity audit/session functions. ADR-003 resolves DB-010 for this permission surface.

No fake user, organization, membership or invitation is inserted. Reference roles and permissions are deterministic deployment configuration.

## Authorization Model

The selected organization cookie is only a hint. Middleware and server resolvers require an active membership. `public.syra_authorize` delegates to a protected resolver that joins current membership, dated assignment, role composition and active permission state. Client helpers can explain already-resolved permissions but cannot authorize a mutation. RLS remains authoritative.

## Runtime Requirements

Real authentication requires configured Supabase project values, SMTP for production email delivery, an applied migration chain and configured Auth redirect URLs. The service-role admin client is server-only and unused by interactive flows.

Local Supabase pgTAP validation remains a required environment gate when Docker and the CLI are available. Repository static checks, TypeScript, unit tests and production build run without real secrets.

## Deferred Identity Work

- MFA enrollment/step-up UI, SSO, passkeys and SCIM;
- invitation issuance/email delivery administration UI;
- organization domain verification and enterprise hierarchy administration;
- distributed production rate limiting and security monitoring integration;
- legacy membership backfill/constraint validation under ADR-002;
- Storage malware scanning worker and old-avatar retention cleanup.
