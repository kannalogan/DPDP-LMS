#!/usr/bin/env sh
set -eu

migration="supabase/migrations/20260706000600_admin_workspace.sql"

test -f "$migration"
grep -q "SYRA-ADR: ADR-009" "$migration"

for table in organization_domains organization_branding organization_audit_preferences organization_security_settings organization_integrations admin_dashboard_events organization_usage_snapshots platform_announcements; do
  grep -q "create table if not exists public.$table" "$migration"
done

for reused in organization_settings organization_invitations; do
  if grep -q "create table if not exists public.$reused" "$migration"; then
    echo "admin check failed: $reused must be reused, not recreated" >&2
    exit 1
  fi
done

for view in admin_organization_overview admin_dashboard_projection; do
  grep -q "create or replace view public.$view" "$migration"
done

for rpc in create_organization_invitation revoke_organization_invitation activate_domain verify_domain update_branding update_security_settings record_dashboard_event publish_platform_announcement archive_platform_announcement; do
  grep -q "function public.$rpc" "$migration"
  grep -q "grant execute on function public.$rpc" "$migration"
done

grep -q "admin.workspace.manage" "$migration"
grep -q "admin_dashboard_events_reject_mutation" "$migration"
grep -q "organization_usage_snapshots_reject_mutation" "$migration"
grep -q "force row level security" "$migration"

echo "admin migration check: ok (8 new tables, 2 reused tables, 2 projections, controlled RPCs)"
