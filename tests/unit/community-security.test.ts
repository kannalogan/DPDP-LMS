import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001700_community_live_learning.sql"),
  "utf8"
);
const actions = readFileSync(join(process.cwd(), "features/community/actions.ts"), "utf8");
describe("community security inventory", () => {
  it("keeps all writes behind controlled RPCs", () => {
    expect(actions).toContain("enforceServerActionSecurity");
    expect(actions).not.toMatch(/\.from\([^)]*\)\.(insert|update|delete|upsert)/);
  });
  it("uses explicit organization and membership helpers", () => {
    for (const helper of [
      "can_moderate_community",
      "can_access_community_space",
      "can_access_chat_channel",
      "can_access_live_session",
      "can_access_study_group"
    ])
      expect(migration).toContain(`function private.${helper}`);
  });
  it("protects private messages and cross-tenant channel membership", () => {
    expect(migration).toContain("chat member outside organization");
    expect(migration).toContain("community_blocks");
    expect(migration).toContain("chat_messages_channel_select");
  });
  it("prevents sensitive attachment and booking projection leaks", () => {
    const attachmentView = migration.slice(
      migration.indexOf("view public.chat_attachment_projection"),
      migration.indexOf("view public.office_hour_booking_projection")
    );
    expect(attachmentView).not.toMatch(/storage_path|checksum|storage_bucket/);
    const bookingView = migration.slice(
      migration.indexOf("view public.office_hour_booking_projection"),
      migration.indexOf("function private.set_community_updated_at")
    );
    expect(bookingView).not.toContain("mentor_private_notes");
  });
  it("records moderation and attendance evidence", () => {
    expect(migration).toContain("'report.'||p_status");
    expect(migration).toContain("attendance.recorded");
    expect(migration).toContain("communication_events_restricted_select");
  });
});
