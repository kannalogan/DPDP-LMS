import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("question authoring routes", () => {
  it("adds protected admin and mentor question-bank navigation", () => {
    const adminLayout = readFileSync(join(root, "app/(admin)/admin/layout.tsx"), "utf8");
    const mentorLayout = readFileSync(join(root, "app/(mentor)/mentor/layout.tsx"), "utf8");
    expect(adminLayout).toContain("ProtectedRoute");
    expect(adminLayout).toContain("/admin/question-bank");
    expect(mentorLayout).toContain("ProtectedRoute");
    expect(mentorLayout).toContain("/mentor/question-bank");
  });

  it("implements required route files", () => {
    for (const route of [
      "app/(admin)/admin/question-bank/page.tsx",
      "app/(admin)/admin/question-bank/new/page.tsx",
      "app/(admin)/admin/question-bank/[questionId]/page.tsx",
      "app/(admin)/admin/question-bank/import/page.tsx",
      "app/(admin)/admin/question-bank/categories/page.tsx",
      "app/(admin)/admin/question-bank/tags/page.tsx",
      "app/(admin)/admin/question-bank/collections/page.tsx",
      "app/(admin)/admin/question-bank/templates/page.tsx",
      "app/(admin)/admin/question-bank/reviews/page.tsx",
      "app/(admin)/admin/question-bank/publishing/page.tsx",
      "app/(mentor)/mentor/question-bank/page.tsx",
      "app/(mentor)/mentor/question-bank/[questionId]/page.tsx"
    ]) {
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessQuestionAuthoring");
    }
  });

  it("uses a server-backed question-bank API without service role", () => {
    const route = readFileSync(join(root, "app/api/admin/question-bank/route.ts"), "utf8");
    expect(route).toContain("getQuestionAuthoringWorkspace");
    expect(route).not.toContain("service_role");
  });
});
