"use server";

import { revalidatePath } from "next/cache";
import {
  archiveAnnouncementSchema,
  brandingSchema,
  domainSchema,
  invitationSchema,
  platformAnnouncementSchema,
  revokeInvitationSchema,
  securitySettingsSchema,
  verifyDomainSchema
} from "@/features/admin/schemas";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

function invalid(result: { error: { flatten(): { fieldErrors: Record<string, string[]> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false } satisfies ActionResult;
}

async function client(action: string) {
  await enforceServerActionSecurity(action, 30);
  return createSupabaseServerClient();
}

function refresh() {
  for (const path of [
    "/admin",
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
    revalidatePath(path);
  }
}

export async function createOrganizationInvitation(formData: FormData): Promise<ActionResult> {
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-invitation-create")
  ).rpc("create_organization_invitation", {
    p_email_ciphertext: parsed.data.emailCiphertext,
    p_email_hash: parsed.data.emailHash,
    p_expires_at: parsed.data.expiresAt,
    p_initial_role_id: parsed.data.initialRoleId,
    p_organization_id: parsed.data.organizationId,
    p_token_hash: parsed.data.tokenHash
  });
  if (error) return { error: "Invitation could not be created.", success: false };
  refresh();
  return { message: "Invitation created.", success: true };
}

export async function revokeOrganizationInvitation(formData: FormData): Promise<ActionResult> {
  const parsed = revokeInvitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-invitation-revoke")
  ).rpc("revoke_organization_invitation", { p_invitation_id: parsed.data.invitationId });
  if (error) return { error: "Invitation could not be revoked.", success: false };
  refresh();
  return { message: "Invitation revoked.", success: true };
}

export async function activateDomain(formData: FormData): Promise<ActionResult> {
  const parsed = domainSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-domain-activate")
  ).rpc("activate_domain", {
    p_domain: parsed.data.domain,
    p_organization_id: parsed.data.organizationId,
    p_verification_token_hash: parsed.data.verificationTokenHash
  });
  if (error) return { error: "Domain could not be activated.", success: false };
  refresh();
  return { message: "Domain activation started.", success: true };
}

export async function verifyDomain(formData: FormData): Promise<ActionResult> {
  const parsed = verifyDomainSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-domain-verify")
  ).rpc("verify_domain", {
    p_domain_id: parsed.data.domainId
  });
  if (error) return { error: "Domain could not be verified.", success: false };
  refresh();
  return { message: "Domain verified.", success: true };
}

export async function updateBranding(formData: FormData): Promise<ActionResult> {
  const parsed = brandingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-branding-update")
  ).rpc("update_branding", {
    p_display_name: parsed.data.displayName,
    p_logo_object_id: null,
    p_organization_id: parsed.data.organizationId,
    p_theme: parsed.data.theme
  });
  if (error) return { error: "Branding could not be updated.", success: false };
  refresh();
  return { message: "Branding updated.", success: true };
}

export async function updateSecuritySettings(formData: FormData): Promise<ActionResult> {
  const parsed = securitySettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-security-update")
  ).rpc("update_security_settings", {
    p_mfa_required: parsed.data.mfaRequired,
    p_organization_id: parsed.data.organizationId,
    p_password_policy: parsed.data.passwordPolicy,
    p_session_timeout_minutes: parsed.data.sessionTimeoutMinutes
  });
  if (error) return { error: "Security settings could not be updated.", success: false };
  refresh();
  return { message: "Security settings updated.", success: true };
}

export async function publishPlatformAnnouncement(formData: FormData): Promise<ActionResult> {
  const parsed = platformAnnouncementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-announcement-publish")
  ).rpc("publish_platform_announcement", {
    p_audience: parsed.data.audience,
    p_body: { markdown: parsed.data.body },
    p_title: parsed.data.title
  });
  if (error) return { error: "Announcement could not be published.", success: false };
  refresh();
  return { message: "Announcement published.", success: true };
}

export async function archivePlatformAnnouncement(formData: FormData): Promise<ActionResult> {
  const parsed = archiveAnnouncementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  const { error } = await (
    await client("admin-announcement-archive")
  ).rpc("archive_platform_announcement", { p_announcement_id: parsed.data.announcementId });
  if (error) return { error: "Announcement could not be archived.", success: false };
  refresh();
  return { message: "Announcement archived.", success: true };
}
