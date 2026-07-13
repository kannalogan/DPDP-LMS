import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseNotificationRepository } from "@/features/notifications/repositories/supabase-notification-repository";
export function createNotificationRepository(
  client: SupabaseClient,
  organizationId: string,
  profileId: string
) {
  return new SupabaseNotificationRepository(client, organizationId, profileId);
}
