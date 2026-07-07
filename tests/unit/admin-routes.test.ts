import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("admin routes", () => {
  it("protects admin layout and exposes required routes", () => {
    const layout = readFileSync(join(root, "app/(admin)/admin/layout.tsx"), "utf8");
    expect(layout).toContain("ProtectedRoute");
    for (const route of [
      "/admin/dashboard",
      "/admin/organizations",
      "/admin/users",
      "/admin/invitations",
      "/admin/domains",
      "/admin/security",
      "/admin/settings",
      "/admin/branding",
      "/admin/announcements"
    ]) {
      expect(layout).toContain(route);
    }
  });

  it("uses server-backed admin dashboard API", () => {
    const route = readFileSync(join(root, "app/api/admin/dashboard/route.ts"), "utf8");
    expect(route).toContain("getAdminWorkspace");
    expect(route).not.toContain("service_role");
  });
});
