import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/20260706000200_learning_delivery.sql", import.meta.url)
  ),
  "utf8"
);

describe("learning delivery migration safety", () => {
  it("does not create or rename frozen tables", () => {
    expect(migration).not.toMatch(/create\s+table/i);
    expect(migration).not.toMatch(/alter\s+table[^;]+rename/i);
  });

  it("keeps progress writes controlled, monotonic, and tenant checked", () => {
    expect(migration).toContain("private.user_owns_enrollment");
    expect(migration).toContain("greatest(public.lesson_progress.progress, safe_progress)");
    expect(migration).toContain("private.lesson_belongs_to_enrollment");
  });

  it("requires encrypted notes and denies anonymous RPC execution", () => {
    expect(migration).toContain("learner_notes_ciphertext_format_check");
    expect(migration).toContain("revoke all on function");
    expect(migration).toContain("from public, anon");
  });

  it("protects both learning object metadata and private storage objects", () => {
    expect(migration).toContain("create policy storage_objects_learning_select");
    expect(migration).toContain("create policy learning_objects_select");
  });

  it("uses PostgreSQL-safe bookmark RPC parameter names", () => {
    expect(migration).toContain("bookmark_position jsonb");
    expect(migration).not.toMatch(/\([^)]*\bposition jsonb/);
  });
});
