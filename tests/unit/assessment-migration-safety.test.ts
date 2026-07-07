import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/20260706000300_assessment_engine.sql", import.meta.url)
  ),
  "utf8"
);

describe("assessment migration safety", () => {
  it("creates canonical entities without Prompt #013 aliases", () => {
    expect(migration).toContain("create table if not exists public.assessment_form_items");
    expect(migration).toContain("create table if not exists public.attempt_responses");
    expect(migration).not.toMatch(
      /create table if not exists public\.(assessment_questions|attempt_answers|grading_results)/
    );
  });

  it("keeps answer keys service-only and out of learner RPCs", () => {
    expect(migration).toContain(
      "revoke all on table public.question_answer_keys from anon, authenticated"
    );
    const deliveryFunctions = migration.slice(
      migration.indexOf("create or replace function public.syra_start_assessment")
    );
    expect(deliveryFunctions).not.toContain("from public.question_answer_keys");
  });

  it("validates assignment, enrollment course, tenant, and ownership", () => {
    expect(migration).toContain("v_enrollment.profile_id <> auth.uid()");
    expect(migration).toContain("assessment is outside enrollment");
    expect(migration).toContain("private.is_active_org_member");
    expect(migration).toContain("private.owns_assessment_attempt");
  });

  it("locks submitted responses and creates pending evaluation preparation", () => {
    expect(migration).toContain("submitted assessment responses are immutable");
    expect(migration).toContain("insert into public.evaluations");
    expect(migration).toContain("'system', 'pending'");
  });
});
