"use server";

import { revalidatePath } from "next/cache";
import { certificateDownloadSchema } from "@/features/certificates/schemas";
import { can } from "@/features/rbac/server";
import { resolveIdentityContext } from "@/features/session/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/identity";

export type CertificateActionResult = ActionResult & { objectPath?: string | null };

function invalid(result: {
  error: { flatten(): { fieldErrors: Record<string, string[]> } };
}): CertificateActionResult {
  return { fieldErrors: result.error.flatten().fieldErrors, success: false };
}

async function secure(action: string) {
  await enforceServerActionSecurity(action, 60);
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await can(identity.organizationId, "organization.read")))
    throw new Error("Certificate permission denied");
  return createSupabaseServerClient();
}

export async function recordCertificateDownload(
  formData: FormData
): Promise<CertificateActionResult> {
  const parsed = certificateDownloadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed);
  try {
    const client = await secure("certificate-download");
    const { data, error } = await client.rpc("download_certificate", {
      p_certificate_id: parsed.data.certificateId
    });
    if (error) return { error: "Certificate download could not be prepared.", success: false };
    revalidatePath("/student/certificates");
    revalidatePath(`/student/certificates/${parsed.data.certificateId}`);
    const descriptor = data as { objectPath?: string | null };
    return {
      message: "Certificate download recorded.",
      objectPath: descriptor.objectPath ?? null,
      success: true
    };
  } catch {
    return { error: "Certificate download could not be prepared.", success: false };
  }
}
