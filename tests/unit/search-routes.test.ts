import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/search/page.tsx",
  "app/search/results/page.tsx",
  "app/search/saved/page.tsx",
  "app/search/history/page.tsx",
  "app/(student)/student/discover/page.tsx",
  "app/(student)/student/recommendations/page.tsx",
  "app/(mentor)/mentor/discover/page.tsx",
  "app/(admin)/admin/search/page.tsx",
  "app/(admin)/admin/search/indexes/page.tsx",
  "app/(admin)/admin/search/analytics/page.tsx",
  "app/(admin)/admin/search/ranking/page.tsx",
  "app/(admin)/admin/search/synonyms/page.tsx",
  "app/(admin)/admin/search/recommendations/page.tsx",
  "app/api/search/route.ts",
  "app/api/search/autocomplete/route.ts",
  "app/api/admin/search/route.ts"
];
describe("search route coverage", () => {
  it("implements all protected routes", () => {
    for (const route of routes) expect(existsSync(join(root, route)), route).toBe(true);
  });
  it("protects global search through its layout", () =>
    expect(readFileSync(join(root, "app/search/layout.tsx"), "utf8")).toContain("ProtectedRoute"));
  it("authorizes search APIs through server context", () => {
    for (const route of routes.filter((item) => item.startsWith("app/api/")))
      expect(readFileSync(join(root, route), "utf8")).toMatch(
        /runSearch|getSearchSuggestions|canAccessSearch/
      );
  });
  it("includes permission, empty, loading, error and responsive states", () => {
    const view = readFileSync(join(root, "features/search/components/route-view.tsx"), "utf8");
    const components = readFileSync(join(root, "features/search/components/index.tsx"), "utf8");
    const css = readFileSync(join(root, "features/search/search.css"), "utf8");
    expect(view).toContain("SearchPermissionDenied");
    expect(view).toContain("SearchEmpty");
    expect(components).toContain("SearchLoading");
    expect(components).toContain("SearchError");
    expect(css).toContain("@media (max-width: 560px)");
  });
});
