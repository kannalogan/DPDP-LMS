import type {
  CertificateDetails,
  CertificateDownloadDescriptor,
  CertificateListItem,
  CertificateStatus,
  CertificateStatusEvent,
  PublicCertificateVerification
} from "@/features/certificates/types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function status(value: unknown): CertificateStatus {
  const candidate = text(value, "pending");
  return ["pending", "active", "expired", "revoked", "superseded"].includes(candidate)
    ? (candidate as CertificateStatus)
    : "pending";
}

function achievement(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CertificateDetails["achievement"])
    : {};
}

function courseTitle(row: Row) {
  const snapshot = achievement(row.achievement_snapshot);
  return snapshot.courseTitle ?? text((row.course_versions as Row | null)?.title, "Certificate");
}

function issuerName(row: Row) {
  return text((row.organizations as Row | null)?.name, "SYRA");
}

export function mapCertificateListItem(row: Row): CertificateListItem {
  return {
    certificateId: text(row.id),
    certificateNumber: text(row.certificate_number),
    courseTitle: courseTitle(row),
    displayName: text(row.display_name_snapshot),
    expiresAt: nullableText(row.expires_at),
    issuedAt: text(row.issued_at),
    issuerName: issuerName(row),
    status: status(row.current_status)
  };
}

export function mapCertificateStatusEvent(row: Row): CertificateStatusEvent {
  return {
    effectiveAt: text(row.effective_at),
    reason: nullableText(row.reason),
    reasonCode: text(row.reason_code),
    status: status(row.status)
  };
}

export function mapCertificateDetails(row: Row, events: Row[]): CertificateDetails {
  return {
    ...mapCertificateListItem(row),
    achievement: achievement(row.achievement_snapshot),
    artifactAvailable: Boolean(row.artifact_object_id),
    events: events.map(mapCertificateStatusEvent)
  };
}

export function mapDownloadDescriptor(value: unknown): CertificateDownloadDescriptor {
  const row = value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
  return {
    bucket: nullableText(row.bucket),
    bytes: typeof row.bytes === "number" ? row.bytes : null,
    contentType: nullableText(row.contentType),
    objectPath: nullableText(row.objectPath),
    sha256: nullableText(row.sha256)
  };
}

export function mapPublicVerification(row: Row): PublicCertificateVerification {
  return {
    courseTitle: text(row.course_title),
    expiresOn: nullableText(row.expires_on),
    holderDisplayName: text(row.holder_display_name),
    issuedOn: text(row.issued_on),
    issuerName: text(row.issuer_name),
    status: status(row.status),
    updatedAt: text(row.updated_at)
  };
}
