import { describe, expect, it } from "vitest";
import { createOrganizationSchema, organizationIdSchema } from "@/features/organizations/schemas";
import { profileSchema } from "@/features/profile/schemas";

describe("organization and profile schemas", () => {
  it("normalizes organization identifiers", () => {
    const result = createOrganizationSchema.parse({
      name: " Acme Learning ",
      slug: "Acme-Learning",
      countryCode: "in"
    });
    expect(result).toEqual({ name: "Acme Learning", slug: "acme-learning", countryCode: "IN" });
  });

  it("requires UUID organization selection", () => {
    expect(organizationIdSchema.safeParse("not-an-id").success).toBe(false);
  });

  it("accepts bounded profile preferences", () => {
    expect(
      profileSchema.safeParse({
        displayName: "Ada Lovelace",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
        theme: "system",
        highContrast: "",
        reduceMotion: "true",
        emailNotifications: "true"
      }).success
    ).toBe(true);
  });
});
