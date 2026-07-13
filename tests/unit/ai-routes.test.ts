import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/(admin)/admin/ai/page.tsx",
  "app/(admin)/admin/ai/providers/page.tsx",
  "app/(admin)/admin/ai/models/page.tsx",
  "app/(admin)/admin/ai/prompts/page.tsx",
  "app/(admin)/admin/ai/guardrails/page.tsx",
  "app/(admin)/admin/ai/usage/page.tsx",
  "app/(admin)/admin/ai/budgets/page.tsx",
  "app/(admin)/admin/ai/audit/page.tsx",
  "app/(mentor)/mentor/ai/page.tsx",
  "app/(mentor)/mentor/ai/tools/page.tsx",
  "app/(student)/student/ai/page.tsx",
  "app/(student)/student/assistant/page.tsx",
  "app/(student)/student/recommendations/page.tsx",
  "app/api/ai/route.ts",
  "app/api/admin/ai/route.ts"
];
describe("AI route coverage", () => {
  it("implements every requested route without replacing recommendations", () => {
    for (const route of routes) expect(existsSync(join(root, route)), route).toBe(true);
    expect(
      readFileSync(join(root, "app/(student)/student/recommendations/page.tsx"), "utf8")
    ).toContain("SearchRouteView");
  });
  it("authorizes both API projections", () => {
    for (const route of routes.filter((item) => item.startsWith("app/api/")))
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessAi");
  });
  it("provides permission and responsive states", () => {
    const view = readFileSync(join(root, "features/ai/components/route-view.tsx"), "utf8");
    const css = readFileSync(join(root, "features/ai/ai.css"), "utf8");
    expect(view).toContain("AiPermissionDenied");
    expect(css).toContain("@media (max-width: 640px)");
  });
});
