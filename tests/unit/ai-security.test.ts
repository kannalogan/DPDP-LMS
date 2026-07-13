import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001400_ai_platform.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/ai/repositories/supabase-ai-repository.ts"),
  "utf8"
);
const actions = readFileSync(join(root, "features/ai/actions.ts"), "utf8");
describe("AI security inventory", () => {
  it("has no anonymous AI policy", () => {
    expect(migration).not.toMatch(/to\s+anon/i);
    expect(migration).toContain("revoke all on table public.%I from anon,authenticated");
  });
  it("filters repositories by tenant and subject", () => {
    expect(repository).toContain('.eq("organization_id", this.organizationId)');
    expect(repository).toContain('.eq("profile_id", this.profileId)');
  });
  it("uses server action security and RPC-only writes", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("enforceServerActionSecurity");
    expect(actions).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete)/);
  });
  it("never exposes encrypted message content in projections", () => {
    const projections = migration.slice(
      migration.indexOf("create or replace view public.ai_provider_catalog_projection"),
      migration.indexOf("create or replace function public.register_ai_provider")
    );
    expect(projections).not.toContain("content_ciphertext");
    expect(projections).not.toContain("title_ciphertext");
  });
});
