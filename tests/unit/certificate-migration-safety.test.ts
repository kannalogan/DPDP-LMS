import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260706000400_certificate_engine.sql"),
  "utf8"
);
const publicPage = readFileSync(
  join(root, "app/certificate/verify/[verificationCode]/page.tsx"),
  "utf8"
);
const apiRoute = readFileSync(
  join(root, "app/api/certificates/verify/[verificationCode]/route.ts"),
  "utf8"
);

describe("certificate migration safety", () => {
  it("uses canonical certificate contract entities only", () => {
    for (const table of [
      "certificate_templates",
      "certificate_template_versions",
      "certificate_eligibility_records",
      "certificates",
      "certificate_status_events",
      "certificate_verification_events"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).not.toContain("create table if not exists public.certificate_revocations");
    expect(migration).not.toContain("create table if not exists public.certificate_verifications");
  });

  it("keeps certificates private and verification projection public-safe", () => {
    expect(migration).toContain("Anonymous access never touches");
    expect(migration).toContain("create or replace view public.certificate_public_views");
    expect(migration).toContain("grant execute on function public.verify_certificate");
    expect(migration).toContain("revoke all on table public.%I from anon, authenticated");
    expect(migration).not.toMatch(/grant\s+select\s+on\s+public\.certificates\s+to\s+anon/i);
  });

  it("enforces immutability through triggers and append-only evidence", () => {
    expect(migration).toContain("certificates_reject_mutation");
    expect(migration).toContain("certificate_status_events_reject_mutation");
    expect(migration).toContain("certificate_verification_events_reject_mutation");
    expect(migration).toContain("published certificate templates are immutable");
  });

  it("exposes only public-safe route data", () => {
    expect(publicPage).toContain("verifyPublicCertificate");
    expect(apiRoute).toContain("verified");
    expect(publicPage).not.toContain("organization_id");
    expect(apiRoute).not.toContain("tenant");
    expect(apiRoute).not.toContain("audit");
  });
});
