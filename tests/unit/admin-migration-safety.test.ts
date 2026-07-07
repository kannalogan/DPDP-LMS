import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000600_admin_workspace.sql"),
  "utf8"
);

describe("admin migration safety", () => {
  it("adds admin operational tables and reuses identity tables", () => {
    for (const table of [
      "organization_domains",
      "organization_branding",
      "organization_audit_preferences",
      "organization_security_settings",
      "organization_integrations",
      "admin_dashboard_events",
      "organization_usage_snapshots",
      "platform_announcements"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).not.toContain("create table if not exists public.organization_settings");
    expect(migration).not.toContain("create table if not exists public.organization_invitations");
  });

  it("uses controlled RPCs for writes", () => {
    for (const rpc of [
      "create_organization_invitation",
      "revoke_organization_invitation",
      "activate_domain",
      "verify_domain",
      "update_branding",
      "update_security_settings",
      "record_dashboard_event",
      "publish_platform_announcement",
      "archive_platform_announcement"
    ]) {
      expect(migration).toContain(`function public.${rpc}`);
    }
    expect(migration).toContain("Admin writes are controlled by RPCs");
  });

  it("enforces RLS and immutable admin evidence", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("admin_dashboard_events_reject_mutation");
    expect(migration).toContain("organization_usage_snapshots_reject_mutation");
    expect(migration).not.toContain("service_role");
  });

  it("provides admin projections and permission", () => {
    expect(migration).toContain("create or replace view public.admin_organization_overview");
    expect(migration).toContain("create or replace view public.admin_dashboard_projection");
    expect(migration).toContain("admin.workspace.manage");
  });
});
