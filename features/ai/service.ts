import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAiRepository } from "@/features/ai/repositories/supabase-ai-repository";
export const createAiRepository = (
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) => new SupabaseAiRepository(client, organizationId, profileId);
