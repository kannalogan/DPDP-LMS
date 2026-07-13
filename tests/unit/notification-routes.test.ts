import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
const routes = [
  "app/(student)/student/notifications/page.tsx",
  "app/(student)/student/inbox/page.tsx",
  "app/(student)/student/messages/page.tsx",
  "app/(mentor)/mentor/notifications/page.tsx",
  "app/(mentor)/mentor/inbox/page.tsx",
  "app/(admin)/admin/notifications/page.tsx",
  "app/(admin)/admin/notifications/templates/page.tsx",
  "app/(admin)/admin/notifications/broadcast/page.tsx",
  "app/(admin)/admin/notifications/schedules/page.tsx",
  "app/(admin)/admin/notifications/history/page.tsx",
  "app/(admin)/admin/announcements/page.tsx",
  "app/(admin)/admin/messages/page.tsx",
  "app/api/notifications/route.ts",
  "app/api/admin/notifications/route.ts",
  "app/api/admin/announcements/route.ts"
];
describe("notification route coverage", () => {
  it("implements every protected route", () => {
    for (const route of routes) expect(existsSync(join(root, route)), route).toBe(true);
  });
  it("authorizes API routes", () => {
    for (const route of routes.filter((item) => item.includes("app/api/")))
      expect(readFileSync(join(root, route), "utf8")).toContain("canAccessNotifications");
  });
  it("uses shared route states", () => {
    const view = readFileSync(
      join(root, "features/notifications/components/route-view.tsx"),
      "utf8"
    );
    expect(view).toContain("NotificationPermissionDenied");
    expect(view).toContain("NotificationEmpty");
  });
});
