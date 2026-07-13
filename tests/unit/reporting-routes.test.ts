import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
describe("reporting route coverage", () => {
  it("protects required pages and APIs", () => {
    for (const route of [
      "app/(admin)/admin/reports/page.tsx",
      "app/(admin)/admin/reports/new/page.tsx",
      "app/(admin)/admin/reports/[reportId]/page.tsx",
      "app/(admin)/admin/reports/templates/page.tsx",
      "app/(admin)/admin/reports/schedules/page.tsx",
      "app/(admin)/admin/reports/history/page.tsx",
      "app/(admin)/admin/dashboard/analytics/page.tsx",
      "app/(admin)/admin/dashboard/executive/page.tsx",
      "app/(admin)/admin/dashboard/system/page.tsx",
      "app/(mentor)/mentor/analytics/page.tsx",
      "app/(mentor)/mentor/reports/page.tsx",
      "app/api/admin/reports/route.ts",
      "app/api/admin/analytics/route.ts"
    ]) {
      const source = readFileSync(join(root, route), "utf8");
      expect(source).toContain("canAccessReporting");
    }
  });
});
