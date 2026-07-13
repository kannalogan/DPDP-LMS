import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260706001100_notification_platform.sql"),
  "utf8"
);
describe("notification migration safety", () => {
  it("is additive and contract referenced", () => {
    expect(migration).toContain("SYRA-CHANGE: additive");
    expect(migration).toContain("SYRA-ADR: ADR-014");
    expect(migration).toContain("force row level security");
  });
  it("reuses canonical runtime tables", () => {
    expect(migration).not.toContain("create table if not exists public.notifications (");
    expect(migration).not.toContain("create table if not exists public.announcements (");
    expect(migration).toContain("alter table public.notifications add column if not exists");
  });
  it("includes controlled RPC inventory", () => {
    for (const rpc of [
      "create_notification",
      "create_notification_template",
      "save_notification_template_draft",
      "publish_notification_template",
      "update_notification_channel",
      "publish_notification",
      "schedule_notification",
      "cancel_notification",
      "create_announcement",
      "publish_announcement",
      "mark_notification_read",
      "mark_notification_unread",
      "archive_notification",
      "restore_notification",
      "dismiss_notification",
      "delete_notification",
      "update_preferences",
      "send_digest",
      "record_delivery_event",
      "record_notification_failure"
    ])
      expect(migration).toContain("function public." + rpc);
  });
  it("keeps evidence and published versions immutable", () => {
    expect(migration).toContain("reject_notification_evidence_mutation");
    expect(migration).toContain("protect_published_notification_template");
  });
  it("contains no provider implementation or business seed", () => {
    expect(migration).not.toMatch(/api[_ -]?key|twilio|sendgrid|resend|firebase|onesignal/i);
    expect(migration).toContain("SYRA-SEED: deployment-reference");
    expect(migration).toContain("SYRA-REFERENCE-DATA-BEGIN");
    expect(migration).not.toContain("SYRA-BUSINESS-SEED");
  });
});
