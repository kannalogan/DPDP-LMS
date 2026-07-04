import "server-only";
import { cache } from "react";
import { AppError } from "@/lib/api/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/types/identity";

export const can = cache(
  async (
    organizationId: string,
    permission: PermissionKey,
    scopeType = "organization",
    scopeId?: string
  ) => {
    const client = await createSupabaseServerClient();
    const { data, error } = await client.rpc("syra_authorize", {
      organization_id: organizationId,
      permission_key: permission,
      scope_id: scopeId ?? null,
      scope_type: scopeType
    });
    if (error) return false;
    return data === true;
  }
);

export async function authorize(
  organizationId: string | null,
  permission: PermissionKey,
  scopeType = "organization",
  scopeId?: string
) {
  if (!organizationId || !(await can(organizationId, permission, scopeType, scopeId))) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action");
  }
}
