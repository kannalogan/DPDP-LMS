import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseReportingRepository } from "@/features/reporting/repositories/supabase-reporting-repository";
export function createReportingRepository(client: SupabaseClient, organizationId: string) {
  return new SupabaseReportingRepository(client, organizationId);
}
