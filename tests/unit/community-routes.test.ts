import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const addedRoutes = [
  "app/(student)/student/community/page.tsx",
  "app/(student)/student/community/topics/page.tsx",
  "app/(student)/student/community/topic/[topicId]/page.tsx",
  "app/(student)/student/messages/[conversationId]/page.tsx",
  "app/(student)/student/live/page.tsx",
  "app/(student)/student/live/[sessionId]/page.tsx",
  "app/(student)/student/study-groups/page.tsx",
  "app/(student)/student/office-hours/page.tsx",
  "app/(mentor)/mentor/community/page.tsx",
  "app/(mentor)/mentor/messages/page.tsx",
  "app/(mentor)/mentor/live/page.tsx",
  "app/(mentor)/mentor/office-hours/page.tsx",
  "app/(mentor)/mentor/study-groups/page.tsx",
  "app/(admin)/admin/community/page.tsx",
  "app/(admin)/admin/moderation/page.tsx",
  "app/(admin)/admin/live/page.tsx",
  "app/(admin)/admin/reports/community/page.tsx",
  "app/api/community/route.ts",
  "app/api/messages/route.ts",
  "app/api/live/route.ts",
  "app/api/live/join/route.ts",
  "app/api/live/attendance/route.ts"
];
describe("community route coverage", () => {
  it("implements every additive Prompt 027 route", () => {
    for (const route of addedRoutes) expect(existsSync(join(root, route)), route).toBe(true);
    expect(addedRoutes).toHaveLength(22);
  });
  it("preserves the frozen student messages entry route", () => {
    const existing = readFileSync(join(root, "app/(student)/student/messages/page.tsx"), "utf8");
    expect(existing).toContain("NotificationRouteView");
  });
  it("uses the shared protected route view", () => {
    for (const route of addedRoutes.filter(
      (item) => !item.startsWith("app/api/") && item.endsWith("page.tsx")
    ))
      expect(readFileSync(join(root, route), "utf8")).toContain("CommunityRouteView");
  });
  it("keeps APIs behind server actions and access checks", () => {
    for (const route of addedRoutes.filter((item) => item.startsWith("app/api/"))) {
      const source = readFileSync(join(root, route), "utf8");
      expect(source).not.toContain("service_role");
      expect(source).not.toMatch(/\.from\(/);
    }
  });
  it("implements responsive and protected UI states", () => {
    const view = readFileSync(join(root, "features/community/components/route-view.tsx"), "utf8");
    const components = readFileSync(join(root, "features/community/components/index.tsx"), "utf8");
    const css = readFileSync(join(root, "features/community/community.css"), "utf8");
    expect(view).toContain("CommunityPermissionDenied");
    expect(view).toContain("CommunityUnavailable");
    expect(components).toContain("CommunityLoading");
    expect(components).toContain("CommunityError");
    expect(components).toContain("CommunityEmpty");
    expect(css).toContain("@media (max-width: 560px)");
  });
});
