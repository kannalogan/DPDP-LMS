import { describe, expect, it } from "vitest";
import { hasClientPermission } from "@/features/rbac/client";

describe("client permission helper", () => {
  it("is explanatory and checks only the supplied server-resolved set", () => {
    expect(hasClientPermission(["organization.read"], "organization.read")).toBe(true);
    expect(hasClientPermission(["organization.read"], "organization.update")).toBe(false);
  });
});
