import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000700_course_authoring_cms.sql"),
  "utf8"
);

describe("course authoring migration safety", () => {
  it("adds authoring tables and reuses canonical learning tables", () => {
    for (const table of [
      "course_drafts",
      "course_reviews",
      "course_publications",
      "module_drafts",
      "lesson_drafts",
      "lesson_review_comments",
      "resource_library",
      "resource_folders",
      "course_assets",
      "publishing_jobs",
      "publishing_events",
      "content_labels",
      "content_categories",
      "content_review_assignments",
      "draft_lock_sessions",
      "version_change_logs",
      "workflow_states",
      "editor_preferences"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    for (const canonical of ["courses", "course_versions", "lessons", "lesson_versions"]) {
      expect(migration).not.toContain(`create table if not exists public.${canonical}`);
    }
  });

  it("uses controlled RPCs for authoring writes", () => {
    for (const rpc of [
      "create_course_draft",
      "save_course_draft",
      "submit_course_review",
      "approve_course",
      "reject_course",
      "publish_course",
      "schedule_publication",
      "archive_course",
      "lock_editor",
      "unlock_editor",
      "record_editor_event"
    ]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
  });

  it("enforces RLS, immutable evidence, and no service-role shortcut", () => {
    expect(migration).toContain("force row level security");
    expect(migration).toContain("course_publications_reject_mutation");
    expect(migration).toContain("publishing_events_reject_mutation");
    expect(migration).toContain("version_change_logs_reject_mutation");
    expect(migration).not.toContain("service_role");
  });

  it("adds permission and projections", () => {
    expect(migration).toContain("course.authoring.manage");
    expect(migration).toContain("create or replace view public.authoring_course_overview");
    expect(migration).toContain("create or replace view public.authoring_publishing_queue");
  });
});
