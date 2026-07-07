import { describe, expect, it } from "vitest";
import { mapDomain, mapOrganization, summarizeMetrics } from "@/features/admin/mappers";
import { adminStatusTone, formatAdminDate } from "@/features/admin/selectors";
import {
  domainSchema,
  platformAnnouncementSchema,
  securitySettingsSchema
} from "@/features/admin/schemas";

describe("admin workspace", () => {
  it("maps organization overview rows into DTOs", () => {
    expect(
      mapOrganization({
        active_members: 10,
        last_admin_event_at: "2026-07-07T00:00:00.000Z",
        name: "Acme",
        organization_id: "org-id",
        pending_invitations: 2,
        slug: "acme",
        status: "active",
        type: "enterprise",
        verified_domains: 1
      })
    ).toMatchObject({ activeMembers: 10, name: "Acme", pendingInvitations: 2 });
  });

  it("summarizes dashboard metrics", () => {
    expect(
      summarizeMetrics([
        { active_members: 2, critical_events: 1, pending_domains: 1, pending_invitations: 3 },
        { active_members: 4, critical_events: 0, pending_domains: 2, pending_invitations: 1 }
      ])
    ).toMatchObject({
      activeMembers: 6,
      criticalEvents: 1,
      pendingDomains: 3,
      pendingInvitations: 4
    });
  });

  it("maps domain rows without leaking verification tokens", () => {
    const domain = mapDomain({
      domain: "example.com",
      id: "domain-id",
      verification_status: "pending",
      verification_token_hash: "hidden"
    });
    expect(domain).toEqual({
      domain: "example.com",
      domainId: "domain-id",
      expiresAt: null,
      status: "pending",
      verifiedAt: null
    });
    expect(domain).not.toHaveProperty("verification_token_hash");
  });

  it("validates admin commands and selectors", () => {
    expect(adminStatusTone("active")).toBe("success");
    expect(adminStatusTone("revoked")).toBe("danger");
    expect(formatAdminDate(null)).toBe("Not recorded");
    expect(
      domainSchema.safeParse({
        domain: "example.com",
        organizationId: "00000000-0000-4000-8000-000000000001",
        verificationTokenHash: "a".repeat(64)
      }).success
    ).toBe(true);
    expect(
      securitySettingsSchema.safeParse({
        mfaRequired: true,
        organizationId: "00000000-0000-4000-8000-000000000001",
        sessionTimeoutMinutes: 60
      }).success
    ).toBe(true);
    expect(
      platformAnnouncementSchema.safeParse({ body: "Maintenance", title: "Notice" }).success
    ).toBe(true);
  });
});
