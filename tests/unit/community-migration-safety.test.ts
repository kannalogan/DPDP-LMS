import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001700_community_live_learning.sql"),
  "utf8"
);
const coreTables = [
  "community_spaces",
  "community_members",
  "discussion_categories",
  "discussion_topics",
  "discussion_posts",
  "discussion_post_revisions",
  "discussion_reactions",
  "discussion_bookmarks",
  "discussion_reports",
  "chat_channels",
  "chat_members",
  "chat_messages",
  "chat_message_reads",
  "chat_attachments",
  "live_sessions",
  "live_session_hosts",
  "live_session_participants",
  "live_session_recordings",
  "live_session_chat",
  "live_session_questions",
  "live_session_polls",
  "live_session_poll_votes",
  "live_session_attendance",
  "live_session_events",
  "office_hours",
  "office_hour_bookings",
  "study_groups",
  "study_group_members",
  "study_group_sessions",
  "whiteboard_sessions",
  "meeting_provider_accounts",
  "communication_events"
];
describe("community migration safety", () => {
  it("is one additive ADR-backed migration", () => {
    expect(migration).toContain("SYRA-ADR: ADR-020");
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).not.toMatch(/drop\s+(table|schema)|truncate\s+/i);
  });
  it("creates every canonical table", () => {
    for (const table of coreTables) expect(migration).toContain(`create table public.${table}`);
    expect(coreTables).toHaveLength(32);
  });
  it("adds safe supporting tables without duplicating frozen domains", () => {
    for (const table of [
      "community_blocks",
      "chat_message_reactions",
      "whiteboard_versions",
      "whiteboard_exports"
    ])
      expect(migration).toContain(`create table public.${table}`);
    expect(migration).not.toMatch(/create table public\.(profiles|organizations|courses)\b/);
  });
  it("creates all required security-invoker projections", () => {
    for (const view of [
      "community_dashboard_projection",
      "live_learning_projection",
      "mentor_communication_projection",
      "student_activity_projection",
      "reporting_community_projection"
    ])
      expect(migration).toContain(`view public.${view} with (security_invoker=true)`);
  });
  it("forces RLS and never grants anonymous access", () => {
    expect(migration).toContain("force row level security");
    expect(migration).not.toMatch(/to\s+anon|service_role/i);
    expect(migration).toContain("revoke all on table");
  });
  it("keeps evidence append-only", () => {
    expect(migration).toContain("reject_communication_evidence_mutation");
    for (const table of [
      "discussion_post_revisions",
      "chat_message_reads",
      "live_session_attendance",
      "communication_events"
    ])
      expect(migration).toContain(`'${table}'`);
  });
  it("does not persist provider credentials", () => {
    expect(migration).toContain("meeting_provider_accounts");
    expect(migration).not.toMatch(/api[_-]?key|access[_-]?token|refresh[_-]?token|client_secret/i);
  });
});
