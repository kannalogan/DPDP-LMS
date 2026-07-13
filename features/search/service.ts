import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseSearchRepository } from "@/features/search/repositories/supabase-search-repository";
export const createSearchRepository = (
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) => new SupabaseSearchRepository(client, organizationId, profileId);
