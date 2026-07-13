import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001300_search_discovery_platform.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/search/repositories/supabase-search-repository.ts"),
  "utf8"
);
const actions = readFileSync(join(root, "features/search/actions.ts"), "utf8");
describe("search security inventory", () => {
  it("has no anonymous search policies or client service role", () => {
    expect(migration).not.toMatch(/to\s+anon/i);
    expect(actions).not.toMatch(/service[_-]?role/i);
  });
  it("requires audience checks in every result-producing function", () => {
    expect(migration.match(/can_read_search_document/g)?.length).toBeGreaterThanOrEqual(14);
    expect(migration).toMatch(
      /function public\.search_content[\s\S]*?private\.can_read_search_document/
    );
    expect(migration).toMatch(
      /function public\.search_autocomplete[\s\S]*?private\.can_read_search_document/
    );
    expect(migration).toMatch(
      /function public\.refresh_recommendations[\s\S]*?private\.can_read_search_document/
    );
    expect(migration).toContain("valid_search_audience");
  });
  it("prevents broad indexing of sensitive source types", () => {
    expect(migration).toContain("'certificate','notification','gradebook','privacy_request'");
    expect(migration).toContain(
      "'question','report','governance_control','policy','evidence','audit_finding','risk'"
    );
  });
  it("uses tenant and subject predicates in repositories", () => {
    expect(repository).toContain('.eq("organization_id", this.organizationId)');
    expect(repository).toContain('.eq("profile_id", this.profileId)');
  });
  it("uses controlled server actions without direct table writes", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("enforceServerActionSecurity");
    expect(actions).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete)/);
  });
});
