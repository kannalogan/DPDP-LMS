import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  mapCatalogCourse,
  mapPublishedLessonBody,
  type CatalogRow
} from "@/features/learning-delivery/repositories/supabase-learning-delivery-repository";
import {
  lessonProgressSchema,
  noteSchema,
  resourceBookmarkSchema
} from "@/features/learning-delivery/schemas";
import { decryptEnvelope, encryptEnvelope } from "@/lib/security/envelope";

const catalogRow: CatalogRow = {
  course: {
    category: { name: "Privacy" },
    id: "course-id",
    organization_id: null,
    slug: "privacy-foundations",
    track: { name: "DPDP" }
  },
  course_id: "course-id",
  description: "Learn approved privacy foundations.",
  difficulty: "introductory",
  id: "version-id",
  locale: "en-IN",
  outcomes: [],
  title: "Privacy Foundations"
};

describe("learning delivery boundaries", () => {
  it("maps catalog rows into stable UI DTOs", () => {
    expect(
      mapCatalogCourse(
        catalogRow,
        { course_version_id: "version-id", id: "enrollment-id", status: "active" },
        { enrollment_id: "enrollment-id", progress: "42.5", status: "in_progress" }
      )
    ).toEqual({
      category: "Privacy",
      courseId: "course-id",
      description: "Learn approved privacy foundations.",
      difficulty: "introductory",
      enrollmentId: "enrollment-id",
      locale: "en-IN",
      progress: 42.5,
      slug: "privacy-foundations",
      status: "in_progress",
      title: "Privacy Foundations",
      track: "DPDP"
    });
  });

  it("maps only supported published lesson body projections", () => {
    expect(mapPublishedLessonBody({ format: "markdown", content: "# Lesson" })).toBe("# Lesson");
    expect(mapPublishedLessonBody({ unexpected: "raw row" })).toBe("");
  });

  it("keeps honest catalog and lesson empty-state copy in the delivery surface", () => {
    const components = readFileSync(
      fileURLToPath(
        new URL("../../features/learning-delivery/components/index.tsx", import.meta.url)
      ),
      "utf8"
    );
    expect(components).toContain('title="No courses"');
    expect(components).toContain('title="Lesson unavailable"');
  });

  it("rejects invalid progress, notes, and resource bookmark commands", () => {
    const base = {
      courseSlug: "course",
      enrollmentId: crypto.randomUUID(),
      lessonId: crypto.randomUUID(),
      lessonSlug: "lesson"
    };
    expect(lessonProgressSchema.safeParse({ ...base, progress: 100 }).success).toBe(false);
    expect(noteSchema.safeParse({ ...base, body: " " }).success).toBe(false);
    expect(
      resourceBookmarkSchema.safeParse({
        courseSlug: "course",
        lessonSlug: "lesson",
        resourceVersionId: "not-a-uuid"
      }).success
    ).toBe(false);
  });

  it("round-trips encrypted notes and rejects a different key", async () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const wrongKey = Buffer.alloc(32, 8).toString("base64");
    const ciphertext = await encryptEnvelope("private note", key);
    expect(ciphertext).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    await expect(decryptEnvelope(ciphertext, key)).resolves.toBe("private note");
    await expect(decryptEnvelope(ciphertext, wrongKey)).rejects.toThrow();
  });

  it("publishes all required delivery route entry points", () => {
    const root = fileURLToPath(new URL("../../app/(student)/student/courses", import.meta.url));
    for (const path of [
      "page.tsx",
      "[courseSlug]/page.tsx",
      "[courseSlug]/modules/[moduleId]/page.tsx",
      "[courseSlug]/lessons/[lessonSlug]/page.tsx"
    ]) {
      const route = readFileSync(`${root}/${path}`, "utf8");
      expect(route).toContain("export default");
      expect(route).toContain("StudentPermissionError");
    }
  });
});
