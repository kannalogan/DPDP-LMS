import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001200_governance_compliance_platform.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/governance/repositories/supabase-governance-repository.ts"),
  "utf8"
);
const actions = readFileSync(join(root, "features/governance/actions.ts"), "utf8");

describe("governance security inventory", () => {
  it("contains no anonymous or public governance policy", () => {
    expect(migration).not.toMatch(/to\s+anon/i);
    expect(migration).toContain("revoke all on table public.%I from anon,authenticated");
  });
  it("enforces tenant filters and subject filters in repositories", () => {
    expect(repository).toContain('.eq("organization_id", this.organizationId)');
    expect(repository).toContain('.eq("requester_profile_id", this.profileId)');
    expect(repository).toContain('.eq("profile_id", this.profileId)');
  });
  it("uses server action security and controlled RPC writes", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("enforceServerActionSecurity");
    expect(actions).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete)/);
  });
  it("does not expose private request ciphertext through projections", () => {
    const projection = migration.slice(
      migration.indexOf("create or replace view public.privacy_request_projection"),
      migration.indexOf("create or replace view public.retention_status_projection")
    );
    expect(projection).not.toContain("details_ciphertext");
    expect(projection).not.toContain("requester_contact_ciphertext");
  });
});
