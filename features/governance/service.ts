import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseGovernanceRepository } from "@/features/governance/repositories/supabase-governance-repository";
export function createGovernanceRepository(
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) {
  return new SupabaseGovernanceRepository(client, organizationId, profileId);
}
