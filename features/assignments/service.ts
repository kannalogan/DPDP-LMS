import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAssignmentRepository } from "@/features/assignments/repositories/supabase-assignment-repository";
export function createAssignmentRepository(
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) {
  return new SupabaseAssignmentRepository(client, organizationId, profileId);
}
