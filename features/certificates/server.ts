import "server-only";
import { cache } from "react";
import {
  createCertificateRepository,
  verificationRequestId
} from "@/features/certificates/service";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const certificateContext = cache(async () => {
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId) return null;
  return (await can(identity.organizationId, "organization.read")) ? identity : null;
});

async function repository() {
  const identity = await certificateContext();
  if (!identity?.organizationId) return null;
  return createCertificateRepository(identity.profileId, identity.organizationId);
}

export async function canAccessCertificates() {
  return Boolean(await certificateContext());
}

export async function getLearnerCertificates() {
  return (await repository())?.listLearnerCertificates() ?? [];
}

export async function getLearnerCertificate(certificateId: string) {
  return (await repository())?.getLearnerCertificate(certificateId) ?? null;
}

export async function verifyPublicCertificate(verificationCode: string) {
  const client = await createSupabaseServerClient();
  const repo = new (
    await import("@/features/certificates/repositories/supabase-certificate-repository")
  ).SupabaseCertificateRepository(client, "", "");
  return repo.verifyCertificate(verificationCode, verificationRequestId());
}
