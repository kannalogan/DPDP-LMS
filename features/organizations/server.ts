import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrganizationSummary } from "@/types/identity";

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("organization_members")
    .select("organization:organizations(id,name,slug,status)")
    .eq("status", "active")
    .is("ended_at", null);

  if (error || !data) return [];
  return data.flatMap((row) => {
    const organization = Array.isArray(row.organization) ? row.organization[0] : row.organization;
    return organization ? [organization as OrganizationSummary] : [];
  });
}

export async function isActiveMember(organizationId: string, profileId: string) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .is("ended_at", null)
    .maybeSingle();
  return !error && Boolean(data);
}
