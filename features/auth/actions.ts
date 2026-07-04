"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getPublicEnv } from "@/config/env";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "@/features/auth/schemas";
import { requireVerifiedUser, resolveIdentityContext } from "@/features/session/server";
import { ORGANIZATION_COOKIE } from "@/features/session/constants";
import { enforceServerActionSecurity, sha256 } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

const genericAuthError = "We could not complete that request. Check your details and try again.";

function invalid(result: {
  error: { flatten(): { fieldErrors: Record<string, string[]> } };
}): ActionResult {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false };
}

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);

  try {
    const request = await enforceServerActionSecurity("login", 8);
    const client = await createSupabaseServerClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    });
    if (error || !data.user || !data.session) return { error: genericAuthError, success: false };

    const cookieStore = await cookies();
    cookieStore.set("syra-remember", parsed.data.rememberMe ? "1" : "0", {
      httpOnly: true,
      maxAge: parsed.data.rememberMe ? 60 * 60 * 24 * 30 : undefined,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    await client.rpc("syra_record_session", {
      assurance: "aal1",
      ip_hash: await sha256(request.forwardedFor),
      organization_id: null,
      session_id_hash: await sha256(data.session.access_token),
      user_agent_hash: await sha256(request.userAgent)
    });
    await client.rpc("syra_record_identity_audit", {
      action: "identity.login",
      correlation_id: request.correlationId,
      metadata: { assurance: "aal1" },
      organization_id: null,
      resource_id: data.user.id,
      resource_type: "profile"
    });
  } catch {
    return { error: genericAuthError, success: false };
  }
  redirect(parsed.data.next as Route);
}

export async function register(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await enforceServerActionSecurity("register", 5);
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.displayName,
          locale: parsed.data.locale,
          timezone: parsed.data.timezone
        },
        emailRedirectTo: `${getPublicEnv().appUrl}/auth/callback?next=/account/profile`
      }
    });
    if (error) return { error: genericAuthError, success: false };
    return { message: "Check your email to verify your account before signing in.", success: true };
  } catch {
    return { error: genericAuthError, success: false };
  }
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await enforceServerActionSecurity("password-reset", 4);
    const client = await createSupabaseServerClient();
    await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getPublicEnv().appUrl}/auth/callback?next=/auth/reset-password`
    });
    return { message: "If an account exists, a password reset link has been sent.", success: true };
  } catch {
    return { message: "If an account exists, a password reset link has been sent.", success: true };
  }
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    await enforceServerActionSecurity("password-update", 5);
    await requireVerifiedUser();
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: genericAuthError, success: false };
    return { message: "Your password has been updated.", success: true };
  } catch {
    return { error: genericAuthError, success: false };
  }
}

export async function logout(): Promise<void> {
  const context = await resolveIdentityContext();
  const client = await createSupabaseServerClient();
  if (context) {
    await client.rpc("syra_record_identity_audit", {
      action: "identity.logout",
      correlation_id: crypto.randomUUID(),
      metadata: {},
      organization_id: context.organizationId,
      resource_id: context.profileId,
      resource_type: "profile"
    });
  }
  await client.auth.signOut({ scope: "local" });
  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE);
  redirect("/auth/login");
}
