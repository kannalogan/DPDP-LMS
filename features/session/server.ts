import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORGANIZATION_COOKIE } from "@/features/session/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IdentityContext } from "@/types/identity";

export async function getVerifiedUser() {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireVerifiedUser() {
  const user = await getVerifiedUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function resolveIdentityContext(): Promise<IdentityContext | null> {
  const user = await getVerifiedUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(ORGANIZATION_COOKIE)?.value ?? null;
  if (!selected) return { organizationId: null, profileId: user.id };

  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", selected)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .is("ended_at", null)
    .maybeSingle();

  return { organizationId: data?.organization_id ?? null, profileId: user.id };
}
