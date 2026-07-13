import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000800_question_authoring_cms.sql"),
  "utf8"
);

describe("question authoring migration safety", () => {
  it("adds authoring tables and reuses runtime tables", () => {
    for (const table of [
      "question_drafts",
      "question_publications",
      "question_import_jobs",
      "question_import_rows",
      "assessment_templates",
      "assessment_section_questions",
      "assessment_authoring_events",
      "question_change_logs",
      "question_media",
      "question_assets"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    for (const runtime of [
      "question_banks",
      "questions",
      "question_versions",
      "assessment_versions"
    ]) {
      expect(migration).not.toContain(`create table if not exists public.${runtime}`);
    }
  });

  it("uses controlled RPCs for writes", () => {
    for (const rpc of [
      "create_question",
      "save_question",
      "publish_question",
      "archive_question",
      "clone_question",
      "create_collection",
      "add_question_to_collection",
      "remove_question_from_collection",
      "create_assessment_template",
      "save_assessment_template",
      "publish_assessment_template",
      "assign_reviewer",
      "approve_question",
      "reject_question",
      "record_authoring_event"
    ]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
  });

  it("enforces RLS, validation, immutable evidence, and no service role", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("validate_question_authoring_payload");
    expect(migration).toContain("question_publications_reject_mutation");
    expect(migration).toContain("assessment_authoring_events_reject_mutation");
    expect(migration).toContain("question_change_logs_reject_mutation");
    expect(migration).not.toContain("service_role");
  });

  it("adds permission and projections", () => {
    expect(migration).toContain("question.authoring.manage");
    expect(migration).toContain("create or replace view public.question_authoring_overview");
    expect(migration).toContain(
      "create or replace view public.assessment_template_authoring_overview"
    );
  });
});
