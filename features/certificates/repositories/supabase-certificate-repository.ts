import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapCertificateDetails,
  mapCertificateListItem,
  mapDownloadDescriptor,
  mapPublicVerification
} from "@/features/certificates/mappers";
import type {
  CertificateDetails,
  CertificateDownloadDescriptor,
  CertificateListItem,
  PublicCertificateVerification
} from "@/features/certificates/types";

export class SupabaseCertificateRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly profileId: string,
    private readonly organizationId: string
  ) {}

  async listLearnerCertificates(): Promise<CertificateListItem[]> {
    const { data, error } = await this.client
      .from("certificates")
      .select(
        "id, certificate_number, display_name_snapshot, achievement_snapshot, issued_at, expires_at, current_status, organizations(name), course_versions(title)"
      )
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .order("issued_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapCertificateListItem(row as Record<string, unknown>));
  }

  async getLearnerCertificate(certificateId: string): Promise<CertificateDetails | null> {
    const { data, error } = await this.client
      .from("certificates")
      .select(
        "id, certificate_number, display_name_snapshot, achievement_snapshot, issued_at, expires_at, current_status, artifact_object_id, organizations(name), course_versions(title)"
      )
      .eq("id", certificateId)
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .maybeSingle();
    if (error || !data) return null;
    const { data: events } = await this.client
      .from("certificate_status_events")
      .select("status, reason_code, reason, effective_at")
      .eq("certificate_id", certificateId)
      .order("effective_at", { ascending: false });
    return mapCertificateDetails(
      data as Record<string, unknown>,
      (events ?? []) as Array<Record<string, unknown>>
    );
  }

  async downloadCertificate(certificateId: string): Promise<CertificateDownloadDescriptor | null> {
    const { data, error } = await this.client.rpc("download_certificate", {
      p_certificate_id: certificateId
    });
    if (error) return null;
    return mapDownloadDescriptor(data);
  }

  async verifyCertificate(
    verificationCode: string,
    requestId: string
  ): Promise<PublicCertificateVerification | null> {
    const { data, error } = await this.client.rpc("verify_certificate", {
      p_country_code: null,
      p_network_fingerprint_hash: null,
      p_request_id: requestId,
      p_verification_code: verificationCode
    });
    if (error || !data?.[0]) return null;
    return mapPublicVerification(data[0] as Record<string, unknown>);
  }
}
