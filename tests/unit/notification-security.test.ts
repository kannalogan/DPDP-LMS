import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001100_notification_platform.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/notifications/repositories/supabase-notification-repository.ts"),
  "utf8"
);
const actions = readFileSync(join(root, "features/notifications/actions.ts"), "utf8");
describe("notification security inventory", () => {
  it("isolates recipients and organization administrators", () => {
    expect(migration).toContain("profile_id=auth.uid()");
    expect(migration).toContain("private.can_manage_notifications(organization_id)");
    expect(migration).not.toMatch(/\bto\s+(anon|public)\b/i);
  });
  it("uses security-invoker projections", () =>
    expect((migration.match(/security_invoker=true/g) ?? []).length).toBeGreaterThanOrEqual(7));
  it("uses server Supabase clients and controlled RPC writes", () => {
    expect(actions).toContain("createSupabaseServerClient");
    expect(actions).toContain("enforceServerActionSecurity");
    expect(actions).not.toContain("service_role");
    expect(repository).toContain("notification_inbox_projection");
  });
  it("keeps provider channels unavailable", () => {
    expect(migration).toContain("provider_key text not null default 'internal'");
    expect(migration).not.toContain("http_request");
  });
});
