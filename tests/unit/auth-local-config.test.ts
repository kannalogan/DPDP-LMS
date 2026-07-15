import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("supabase/config.toml", "utf8");

describe("local Supabase Auth configuration", () => {
  it("requires email verification and allows the local callback route", () => {
    expect(config).toContain("[auth.email]");
    expect(config).toContain("enable_confirmations = true");
    expect(config).toContain('site_url = "http://localhost:3000"');
    expect(config).toContain('"http://localhost:3000/**"');
  });
});
