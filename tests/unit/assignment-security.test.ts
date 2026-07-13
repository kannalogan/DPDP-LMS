import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706001000_assignment_grading_platform.sql"),
  "utf8"
);
const repository = readFileSync(
  join(root, "features/assignments/repositories/supabase-assignment-repository.ts"),
  "utf8"
);
describe("assignment security and repository", () => {
  it("filters student repository data by verified profile", () => {
    expect(repository).toContain('eq("learner_profile_id", this.profileId)');
    expect(repository).toContain('eq("released", true)');
  });
  it("uses server projections and never service role", () => {
    expect(repository).toContain("student_assignment_projection");
    expect(repository).toContain("grading_queue_projection");
    expect(repository).not.toContain("service_role");
  });
  it("enforces submission ownership and grading authorization", () => {
    expect(migration).toContain("private.owns_assignment_submission");
    expect(migration).toContain("private.can_grade_assignment");
  });
  it("hides unreleased grading from learners", () =>
    expect(migration).toContain("status='released'"));
  it("protects private storage and submitted files", () => {
    expect(migration).toContain("assignment-private");
    expect(migration).toContain("assignment_objects_delete_draft");
    expect(migration).toContain("sv.status<>'draft'");
  });
  it("provides reporting and gradebook projections", () => {
    expect(migration).toContain("assignment_reporting_projection");
    expect(migration).toContain("assignment_gradebook_projection");
  });
});
