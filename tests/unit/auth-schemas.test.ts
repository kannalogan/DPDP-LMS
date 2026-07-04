import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/features/auth/schemas";

describe("identity authentication schemas", () => {
  it("normalizes login email and preserves remember preference", () => {
    const result = loginSchema.parse({
      email: " USER@Example.COM ",
      password: "value",
      rememberMe: "true"
    });
    expect(result).toEqual({
      email: "user@example.com",
      next: "/account/profile",
      password: "value",
      rememberMe: true
    });
  });

  it("rejects weak and mismatched registration passwords", () => {
    const result = registerSchema.safeParse({
      displayName: "Ada",
      email: "ada@example.com",
      password: "weak",
      confirmPassword: "different",
      locale: "en",
      timezone: "UTC"
    });
    expect(result.success).toBe(false);
  });

  it("accepts a strong matching recovery password", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "SecurePassword9",
        confirmPassword: "SecurePassword9"
      }).success
    ).toBe(true);
  });
});
