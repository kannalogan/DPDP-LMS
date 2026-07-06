import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260706000100_learning_domain.sql", import.meta.url)
);
const migration = readFileSync(migrationPath, "utf8");

describe("learning migration safety", () => {
  it("creates only canonical learning table names", () => {
    expect(migration).toContain("create table if not exists public.learning_tracks");
    expect(migration).toContain("create table if not exists public.course_modules");
    expect(migration).toContain("create table if not exists public.learning_resources");
    expect(migration).not.toMatch(
      /create table if not exists public\.(tracks|modules|resources)\s*\(/
    );
  });

  it("binds self-owned writes to authenticated profile and active organization", () => {
    for (const table of [
      "learner_bookmarks",
      "learner_notes",
      "learner_favorites",
      "study_plans"
    ]) {
      expect(migration).toContain(`create policy ${table}_insert_self`);
    }
    expect(migration).toContain("profile_id = auth.uid()");
    expect(migration).toContain("private.is_active_org_member(organization_id)");
  });

  it("keeps catalog mutation behind the controlled platform permission", () => {
    expect(migration).toContain("private.has_platform_permission('learning.catalog.manage')");
    expect(migration).toContain("create policy courses_manage");
    expect(migration).toContain("create policy courses_select");
  });

  it("contains no production user, tenant, or learning business seed rows", () => {
    const referenceData = migration.slice(
      migration.indexOf("-- SYRA-REFERENCE-DATA-BEGIN"),
      migration.indexOf("-- SYRA-REFERENCE-DATA-END")
    );
    expect(referenceData).toContain("insert into public.permissions");
    expect(referenceData).not.toMatch(
      /insert into public\.(profiles|organizations|learning_tracks|courses|enrollments|study_plans)/
    );
  });
});
