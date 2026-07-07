import "server-only";
import { randomUUID } from "node:crypto";
import { SupabaseCertificateRepository } from "@/features/certificates/repositories/supabase-certificate-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCertificateRepository(profileId: string, organizationId: string) {
  return new SupabaseCertificateRepository(
    await createSupabaseServerClient(),
    profileId,
    organizationId
  );
}

export function verificationRequestId() {
  return `verify-${randomUUID()}`;
}
