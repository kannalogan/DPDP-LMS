import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001000_assignment_grading_platform.sql"),
  "utf8"
);
const referenceData = migration
  .split("-- SYRA-REFERENCE-DATA-BEGIN")[1]
  ?.split("-- SYRA-REFERENCE-DATA-END")[0];
describe("assignment migration safety", () => {
  it("is additive, classified and ADR-backed", () => {
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).toContain("SYRA-ADR: ADR-013");
    expect(migration).toContain("SYRA-PII: P3");
  });
  it("reuses frozen rubric tables", () => {
    for (const table of ["rubrics", "rubric_versions", "rubric_criteria"])
      expect(migration).not.toContain("create table if not exists public." + table + " ");
  });
  it("forces RLS and prevents public access", () => {
    expect(migration).toContain("force row level security");
    expect(migration).not.toMatch(/\bto\s+(anon|public)\b/);
  });
  it("contains controlled RPC inventory", () => {
    for (const rpc of [
      "create_assignment",
      "publish_assignment",
      "start_assignment_submission",
      "submit_assignment",
      "claim_grading_item",
      "finalize_grade",
      "release_feedback"
    ])
      expect(migration).toContain("function public." + rpc);
  });
  it("preserves immutable evidence", () => {
    expect(migration).toContain("assignment_publications_immutable");
    expect(migration).toContain("submission_versions_immutable");
    expect(migration).toContain("gradebook_events_immutable");
  });
  it("contains no business seed rows", () =>
    expect(referenceData).not.toMatch(
      /insert into public\.(assignments|assignment_submissions|gradebook_entries)\s*\(/i
    ));
});
