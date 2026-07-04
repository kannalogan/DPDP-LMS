"use server";

import { cookies } from "next/headers";
import {
  createOrganizationSchema,
  invitationTokenSchema,
  organizationIdSchema
} from "@/features/organizations/schemas";
import { isActiveMember } from "@/features/organizations/server";
import { ORGANIZATION_COOKIE } from "@/features/session/constants";
import { requireVerifiedUser } from "@/features/session/server";
import { enforceServerActionSecurity, sha256 } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

async function selectOrganization(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, success: false };
  try {
    await enforceServerActionSecurity("organization-create", 3);
    await requireVerifiedUser();
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("syra_create_organization", {
      country_code: parsed.data.countryCode,
      name: parsed.data.name,
      slug: parsed.data.slug
    });
    if (error || typeof data !== "string")
      return { error: "Organization creation failed.", success: false };
    await selectOrganization(data);
    return { message: "Organization created and selected.", success: true };
  } catch {
    return { error: "Organization creation failed.", success: false };
  }
}

export async function switchOrganization(formData: FormData): Promise<ActionResult> {
  const parsed = organizationIdSchema.safeParse(formData.get("organizationId"));
  if (!parsed.success) return { error: "Choose a valid organization.", success: false };
  const user = await requireVerifiedUser();
  if (!(await isActiveMember(parsed.data, user.id)))
    return { error: "Organization access is not active.", success: false };
  await selectOrganization(parsed.data);
  return { success: true };
}

export async function acceptInvitation(formData: FormData): Promise<ActionResult> {
  const parsed = invitationTokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) return { error: "This invitation link is invalid.", success: false };
  try {
    await enforceServerActionSecurity("invitation-accept", 6);
    await requireVerifiedUser();
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("syra_accept_invitation", {
      token_hash: await sha256(parsed.data)
    });
    if (error || typeof data !== "string")
      return { error: "This invitation is invalid or expired.", success: false };
    await selectOrganization(data);
    return { message: "Invitation accepted.", success: true };
  } catch {
    return { error: "This invitation is invalid or expired.", success: false };
  }
}
