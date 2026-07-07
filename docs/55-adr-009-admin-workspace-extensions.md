# ADR-009: Admin Workspace Operational Extensions

## Status

Accepted.

## Context

Prompt #016 introduces organization administration and platform administration. The frozen catalog already includes `organization_settings`, `organization_invitations`, `organization_domains`, `system_config_versions` and admin roles. Prompt #016 also names operational admin tables that were not part of the original 169-table catalog.

## Decision

Implement Prompt #016 as an additive admin wave:

- Reuse existing `organization_settings` and `organization_invitations`.
- Add the cataloged `organization_domains`.
- Add admin operational extension tables for branding, audit preferences, security settings, integrations, dashboard evidence, usage snapshots and platform announcements.
- Keep writes behind controlled RPCs.
- Treat `admin_dashboard_events` and `organization_usage_snapshots` as append-only evidence.

## Consequences

The admin workspace can manage tenant operations without changing student, mentor, assessment, certificate, learning or identity behavior. The added extension tables are admin-owned and subject to `admin.workspace.manage` authorization.
