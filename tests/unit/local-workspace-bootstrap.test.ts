import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertLocalBootstrapEnvironment,
  assertLocalDatabaseUrl,
  normalizeBootstrapEmails
} from "../../scripts/local/bootstrap-guard.mjs";

const sql = readFileSync("scripts/local/bootstrap-workspaces.sql", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");

describe("local workspace bootstrap", () => {
  it("accepts only loopback development Supabase environments", () => {
    expect(
      assertLocalBootstrapEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NODE_ENV: "development"
      }).hostname
    ).toBe("127.0.0.1");
    expect(() =>
      assertLocalBootstrapEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NODE_ENV: "development"
      })
    ).toThrow("non-loopback");
    expect(() =>
      assertLocalBootstrapEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NODE_ENV: "production"
      })
    ).toThrow("disabled");
    expect(() =>
      assertLocalBootstrapEnvironment({
        CI: "true",
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NODE_ENV: "test"
      })
    ).toThrow("CI");
    expect(() => assertLocalDatabaseUrl("postgresql://user@db.example.com/postgres")).toThrow(
      "non-local"
    );
  });

  it("requires three distinct normalized identities", () => {
    expect(
      normalizeBootstrapEmails({
        admin: " ADMIN@example.com ",
        mentor: "mentor@example.com",
        student: "student@example.com"
      })
    ).toEqual({
      admin: "admin@example.com",
      mentor: "mentor@example.com",
      student: "student@example.com"
    });
    expect(() =>
      normalizeBootstrapEmails({
        admin: "same@example.com",
        mentor: "mentor@example.com",
        student: "same@example.com"
      })
    ).toThrow("distinct");
  });

  it("uses frozen controlled workflows and explicit scoped roles", () => {
    for (const rpc of [
      "syra_create_organization",
      "create_organization_invitation",
      "syra_accept_invitation",
      "update_branding",
      "create_course_draft",
      "publish_course",
      "assign_cohort",
      "assign_mentor",
      "syra_start_course",
      "syra_update_lesson_progress",
      "create_assignment",
      "publish_assignment",
      "publish_announcement"
    ]) {
      expect(sql).toContain(`public.${rpc}`);
    }
    expect(sql).toContain("key = 'student'");
    expect(sql).toContain("key = 'mentor'");
    expect(sql).toContain("key = 'organization_admin'");
    expect(sql).toContain("scope_type = 'organization'");
  });

  it("is idempotent and preserves existing bootstrap-owned records", () => {
    expect(sql).toContain("where slug = 'syra-local-acceptance'");
    expect(sql).toContain("where organization_id = v_org and slug = 'local-acceptance-course'");
    expect(sql.match(/on conflict/gi)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toContain("case when organization_created then 'created' else 'reused' end");
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("\\set ON_ERROR_STOP on");
  });

  it("keeps bootstrap outside migrations, seeds, credentials, and client code", () => {
    expect(packageJson.scripts["local:bootstrap"]).toBe(
      "node scripts/local/bootstrap-workspaces.mjs"
    );
    expect(supabaseConfig).toContain("[db.seed]");
    expect(supabaseConfig).toContain("enabled = false");
    expect(supabaseConfig).toContain("sql_paths = []");
    expect(sql).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(sql).not.toMatch(/service[_-]?role|supabase_service_role_key|sb_secret_/i);
    expect(sql).not.toMatch(/password\s*[:=]\s*['"]/i);
  });

  it("asserts tenant visibility and denies cross-workspace administration", () => {
    expect(sql).toContain("student organization RLS verification failed");
    expect(sql).toContain("student assignment projection verification failed");
    expect(sql).toContain("student mentor-assignment isolation failed");
    expect(sql).toContain("mentor assignment RLS verification failed");
    expect(sql).toContain("public.syra_authorize(v_org, 'admin.workspace.manage')");
    expect(sql).toContain("student role authorization is invalid");
    expect(sql).toContain("mentor role authorization is invalid");
  });
});
