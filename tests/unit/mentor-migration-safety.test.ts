import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000500_mentor_workspace.sql"),
  "utf8"
);

describe("mentor migration safety", () => {
  it("creates canonical mentor/cohort entities and no aliases", () => {
    for (const table of [
      "cohorts",
      "cohort_members",
      "mentor_profiles",
      "mentor_assignments",
      "mentor_interventions",
      "learner_reviews",
      "risk_signals",
      "notifications",
      "announcements",
      "announcement_acknowledgements"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).not.toContain("create table if not exists public.mentor_reviews");
    expect(migration).not.toContain("create table if not exists public.interventions");
  });

  it("uses assigned-cohort authorization helpers", () => {
    expect(migration).toContain("private.can_access_cohort");
    expect(migration).toContain("private.can_access_assigned_learner");
    expect(migration).toContain("ma.ends_at is null");
    expect(migration).toContain("mentor.workspace.manage");
  });

  it("adds safe projections and controlled RPCs", () => {
    for (const view of [
      "mentor_dashboard_projections",
      "mentor_learner_activity_summaries",
      "mentor_task_queue",
      "mentor_review_queue"
    ]) {
      expect(migration).toContain(`create or replace view public.${view}`);
    }
    for (const rpc of [
      "assign_mentor",
      "assign_cohort",
      "record_mentor_note",
      "create_intervention",
      "mark_intervention_complete",
      "publish_announcement",
      "record_dashboard_event",
      "resolve_review_item"
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
    }
  });

  it("keeps mentor data deny-by-default and learner-inaccessible", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("Learner-facing clients cannot select mentor data");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+public\.mentor_assignments\s+to\s+anon/i);
    expect(migration).not.toContain("service_role");
  });
});
