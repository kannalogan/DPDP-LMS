import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("course authoring routes", () => {
  it("adds protected admin and mentor authoring navigation", () => {
    const adminLayout = readFileSync(join(root, "app/(admin)/admin/layout.tsx"), "utf8");
    const mentorLayout = readFileSync(join(root, "app/(mentor)/mentor/layout.tsx"), "utf8");
    expect(adminLayout).toContain("ProtectedRoute");
    expect(adminLayout).toContain("/admin/authoring");
    expect(mentorLayout).toContain("ProtectedRoute");
    expect(mentorLayout).toContain("/mentor/authoring");
  });

  it("implements required route files", () => {
    for (const route of [
      "app/(admin)/admin/authoring/page.tsx",
      "app/(admin)/admin/authoring/courses/page.tsx",
      "app/(admin)/admin/authoring/courses/new/page.tsx",
      "app/(admin)/admin/authoring/courses/[courseId]/page.tsx",
      "app/(admin)/admin/authoring/courses/[courseId]/review/page.tsx",
      "app/(admin)/admin/authoring/courses/[courseId]/versions/page.tsx",
      "app/(admin)/admin/authoring/resources/page.tsx",
      "app/(admin)/admin/authoring/categories/page.tsx",
      "app/(admin)/admin/authoring/publishing/page.tsx",
      "app/(mentor)/mentor/authoring/page.tsx",
      "app/(mentor)/mentor/authoring/courses/page.tsx",
      "app/(mentor)/mentor/authoring/courses/[courseId]/page.tsx"
    ]) {
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessAuthoringWorkspace");
    }
  });

  it("uses a server-backed authoring API without service role", () => {
    const route = readFileSync(join(root, "app/api/admin/authoring/route.ts"), "utf8");
    expect(route).toContain("getAuthoringWorkspace");
    expect(route).not.toContain("service_role");
  });
});
