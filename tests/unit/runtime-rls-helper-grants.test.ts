import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260716115813_restore_authenticated_rls_helper_execution.sql",
  "utf8"
);

describe("authenticated RLS helper execution", () => {
  it("grants authenticated access to the existing learning and assessment predicates", () => {
    for (const signature of [
      "user_has_resource_access(uuid, uuid)",
      "can_read_assessment_assignment(uuid)",
      "can_manage_assessment_catalog()",
      "can_read_attempt(uuid)",
      "can_read_question_version(uuid)"
    ]) {
      expect(migration).toContain(
        `grant execute on function private.${signature} to authenticated;`
      );
    }
  });

  it("keeps the policy predicates unavailable to anonymous callers", () => {
    for (const signature of [
      "user_has_resource_access(uuid, uuid)",
      "can_read_assessment_assignment(uuid)",
      "can_manage_assessment_catalog()",
      "can_read_attempt(uuid)",
      "can_read_question_version(uuid)"
    ]) {
      expect(migration).toContain(`revoke all on function private.${signature} from public, anon;`);
    }
    expect(migration).not.toMatch(/create\s+policy|alter\s+policy/i);
  });

  it("exposes only security-invoker assignment projections to authenticated users", () => {
    for (const projection of [
      "assignment_catalog_projection",
      "student_assignment_projection",
      "grading_queue_projection",
      "assignment_gradebook_projection",
      "assignment_reporting_projection"
    ]) {
      expect(migration).toContain(`public.${projection}`);
    }
    expect(migration).toMatch(/grant select on table[\s\S]+to authenticated;/);
    expect(migration).toMatch(/revoke all on table[\s\S]+from public, anon;/);
  });

  it("grants read-only projection dependencies while preserving RPC-only writes", () => {
    for (const table of [
      "assignments",
      "assignment_versions",
      "assignment_windows",
      "assignment_assignments",
      "assignment_submissions",
      "submission_versions",
      "grading_queue_items",
      "grading_assignments",
      "gradebook_entries"
    ]) {
      expect(migration).toContain(`public.${table}`);
    }
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all)/i);
  });
});
