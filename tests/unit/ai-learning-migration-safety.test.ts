import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001600_ai_learning_assistant.sql"),
  "utf8"
);
const tables = [
  "ai_learning_sessions",
  "ai_learning_context",
  "ai_learning_plans",
  "ai_learning_plan_steps",
  "ai_flashcard_sets",
  "ai_flashcards",
  "ai_quiz_generations",
  "ai_quiz_questions",
  "ai_quiz_attempts",
  "ai_learning_recommendations",
  "ai_revision_plans",
  "ai_revision_sessions",
  "ai_concept_explanations",
  "ai_summary_requests",
  "ai_learning_memory",
  "ai_student_strengths",
  "ai_student_weaknesses",
  "ai_study_goals",
  "ai_learning_preferences",
  "ai_learning_events"
];
const rpcs = [
  "create_learning_session",
  "save_learning_context",
  "append_learning_message",
  "generate_flashcards",
  "generate_quiz",
  "generate_summary",
  "generate_explanation",
  "generate_revision_plan",
  "generate_learning_plan",
  "generate_learning_recommendations",
  "record_learning_insights",
  "record_learning_feedback",
  "record_learning_event",
  "close_learning_session"
];
describe("AI learning migration safety", () => {
  it("is one additive ADR-backed migration", () => {
    expect(migration).toContain("SYRA-ADR: ADR-019");
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).not.toMatch(/delete\s+from|drop\s+(table|schema)/i);
  });
  it("creates the complete canonical table inventory", () => {
    for (const table of tables)
      expect(migration).toContain(`create table if not exists public.${table}`);
    expect(tables).toHaveLength(20);
  });
  it("creates five security-invoker projections", () => {
    for (const view of [
      "student_ai_dashboard_projection",
      "student_ai_progress_projection",
      "mentor_ai_student_projection",
      "reporting_ai_learning_projection",
      "ai_learning_usage_projection"
    ])
      expect(migration).toContain(`view public.${view} with(security_invoker=true)`);
    expect(migration.match(/security_invoker=true/g)).toHaveLength(5);
  });
  it("exposes controlled execution-backed RPCs", () => {
    for (const rpc of rpcs) expect(migration).toContain(`function public.${rpc}`);
    expect(migration).toContain("private.completed_ai_learning_execution");
  });
  it("forces RLS and keeps evidence immutable", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("reject_ai_learning_evidence_mutation");
    expect(migration).not.toMatch(/to\s+anon|service_role/i);
  });
  it("keeps admin analytics free of encrypted learning content", () => {
    const views = migration.slice(
      migration.indexOf("create or replace view public.student_ai_dashboard_projection"),
      migration.indexOf("create or replace function public.create_learning_session")
    );
    expect(views).not.toMatch(/ciphertext|ai_messages|answer_/);
  });
});
