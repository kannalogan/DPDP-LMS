import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCommunityRepository } from "@/features/community/repositories/supabase-community-repository";
export const createCommunityRepository = (
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) => new SupabaseCommunityRepository(client, organizationId, profileId);
