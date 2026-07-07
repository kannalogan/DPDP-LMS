# Admin Workspace Implementation

Prompt #016 adds the Admin Workspace foundation for organization administrators and platform administrators.

## Database

The additive migration is `supabase/migrations/20260706000600_admin_workspace.sql`.

It reuses:

- `organization_settings`
- `organization_invitations`

It adds:

- `organization_domains`
- `organization_branding`
- `organization_audit_preferences`
- `organization_security_settings`
- `organization_integrations`
- `admin_dashboard_events`
- `organization_usage_snapshots`
- `platform_announcements`

It also adds admin-safe projections:

- `admin_organization_overview`
- `admin_dashboard_projection`

## RPCs

- `create_organization_invitation`
- `revoke_organization_invitation`
- `activate_domain`
- `verify_domain`
- `update_branding`
- `update_security_settings`
- `record_dashboard_event`
- `publish_platform_announcement`
- `archive_platform_announcement`

## Routes

- `/admin`
- `/admin/dashboard`
- `/admin/organizations`
- `/admin/organizations/[organizationId]`
- `/admin/users`
- `/admin/invitations`
- `/admin/domains`
- `/admin/security`
- `/admin/settings`
- `/admin/branding`
- `/admin/announcements`
- `/api/admin/dashboard`

## Non-Goals

This wave does not implement billing, AI, analytics, reporting, finance, LMS authoring or support desk.
