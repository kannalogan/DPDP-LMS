import "server-only";
import { cache } from "react";
import { resolveAdminContext } from "@/features/admin/authorization";
import { SupabaseAdminRepository } from "@/features/admin/repositories/supabase-admin-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const adminContext = cache(resolveAdminContext);

async function repository() {
  const identity = await adminContext();
  if (!identity?.organizationId) return null;
  return new SupabaseAdminRepository(await createSupabaseServerClient(), identity.organizationId);
}

export async function canAccessAdminWorkspace() {
  return Boolean(await adminContext());
}

export async function getAdminWorkspace() {
  return (await repository())?.getWorkspace() ?? null;
}

export async function getAdminOrganization(organizationId: string) {
  return (await repository())?.getOrganization(organizationId) ?? null;
}
