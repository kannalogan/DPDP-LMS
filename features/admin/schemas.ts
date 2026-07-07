import { z } from "zod";

const uuid = z.string().uuid();

export const adminOrganizationRouteSchema = z.object({ organizationId: uuid });

export const invitationSchema = z.object({
  emailCiphertext: z.string().min(8),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.string().datetime(),
  initialRoleId: uuid,
  organizationId: uuid,
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/)
});

export const revokeInvitationSchema = z.object({ invitationId: uuid });

export const domainSchema = z.object({
  domain: z.string().trim().min(4).max(253),
  organizationId: uuid,
  verificationTokenHash: z.string().regex(/^[a-f0-9]{64}$/)
});

export const verifyDomainSchema = z.object({ domainId: uuid });

export const brandingSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  organizationId: uuid,
  theme: z.record(z.string(), z.unknown()).default({})
});

export const securitySettingsSchema = z.object({
  mfaRequired: z.coerce.boolean(),
  organizationId: uuid,
  passwordPolicy: z.record(z.string(), z.unknown()).default({}),
  sessionTimeoutMinutes: z.coerce.number().int().min(15).max(43200)
});

export const platformAnnouncementSchema = z.object({
  audience: z.enum(["admins", "organization_admins", "platform_admins"]).default("admins"),
  body: z.string().trim().min(2).max(5000),
  title: z.string().trim().min(1).max(200)
});

export const archiveAnnouncementSchema = z.object({ announcementId: uuid });
