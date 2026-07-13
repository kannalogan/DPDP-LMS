import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/(admin)/admin/governance/page.tsx",
  "app/(admin)/admin/governance/controls/page.tsx",
  "app/(admin)/admin/governance/evidence/page.tsx",
  "app/(admin)/admin/governance/audits/page.tsx",
  "app/(admin)/admin/governance/findings/page.tsx",
  "app/(admin)/admin/governance/policies/page.tsx",
  "app/(admin)/admin/governance/risks/page.tsx",
  "app/(admin)/admin/governance/exceptions/page.tsx",
  "app/(admin)/admin/governance/privacy/page.tsx",
  "app/(admin)/admin/governance/retention/page.tsx",
  "app/(admin)/admin/governance/dashboard/page.tsx",
  "app/(admin)/admin/compliance/page.tsx",
  "app/(admin)/admin/compliance/reviews/page.tsx",
  "app/(admin)/admin/compliance/evidence/page.tsx",
  "app/(admin)/admin/compliance/reports/page.tsx",
  "app/account/privacy/page.tsx",
  "app/account/privacy/requests/page.tsx",
  "app/account/privacy/consents/page.tsx",
  "app/account/policies/page.tsx",
  "app/api/admin/governance/route.ts",
  "app/api/admin/compliance/route.ts",
  "app/api/account/privacy/route.ts"
];
describe("governance route coverage", () => {
  it("implements every protected route", () => {
    for (const route of routes) expect(existsSync(join(root, route)), route).toBe(true);
  });
  it("authorizes every API projection", () => {
    for (const route of routes.filter((item) => item.startsWith("app/api/")))
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessGovernance");
  });
  it("uses shared permission, empty, and responsive route states", () => {
    const view = readFileSync(join(root, "features/governance/components/route-view.tsx"), "utf8");
    const css = readFileSync(join(root, "features/governance/governance.css"), "utf8");
    expect(view).toContain("GovernancePermissionDenied");
    expect(view).toContain("GovernanceEmpty");
    expect(css).toContain("@media (max-width: 640px)");
  });
});
