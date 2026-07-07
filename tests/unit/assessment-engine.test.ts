import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { availability } from "@/features/assessment-engine/repositories/supabase-assessment-repository";
import { answerCommandSchema, assessmentStartSchema } from "@/features/assessment-engine/schemas";
import { formatRemainingTime } from "@/features/assessment-engine/selectors";

describe("assessment engine delivery boundaries", () => {
  it("maps assignment windows into stable learner availability", () => {
    const now = new Date("2026-07-06T10:00:00Z");
    expect(availability("available", null, null, now)).toBe("available");
    expect(availability("available", "2026-07-07T10:00:00Z", null, now)).toBe("upcoming");
    expect(availability("available", null, "2026-07-05T10:00:00Z", now)).toBe("expired");
    expect(availability("locked", null, null, now)).toBe("locked");
  });

  it("validates start and autosave commands without score fields", () => {
    expect(
      assessmentStartSchema.safeParse({
        assessmentId: crypto.randomUUID(),
        assignmentId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID()
      }).success
    ).toBe(true);
    expect(
      answerCommandSchema.safeParse({
        assessmentId: crypto.randomUUID(),
        attemptId: crypto.randomUUID(),
        attemptItemId: crypto.randomUUID(),
        clientVersion: 1,
        response: JSON.stringify({ text: "Answer" }),
        score: 100
      }).success
    ).toBe(true);
    expect(
      answerCommandSchema.safeParse({
        assessmentId: crypto.randomUUID(),
        attemptId: crypto.randomUUID(),
        attemptItemId: crypto.randomUUID(),
        clientVersion: 1,
        response: "not-json"
      }).success
    ).toBe(false);
  });

  it("formats timer values and clamps expiry at zero", () => {
    expect(formatRemainingTime(3_661_000)).toBe("61:01");
    expect(formatRemainingTime(-100)).toBe("00:00");
  });

  it("publishes protected assessment route entry points", () => {
    const root = fileURLToPath(new URL("../../app/(student)/student/assessments", import.meta.url));
    for (const path of [
      "page.tsx",
      "[assessmentSlug]/page.tsx",
      "[assessmentSlug]/attempt/page.tsx",
      "[assessmentSlug]/review/page.tsx"
    ]) {
      const route = readFileSync(`${root}/${path}`, "utf8");
      expect(route).toContain("export default");
      expect(route).toContain("StudentPermissionError");
    }
  });
});
