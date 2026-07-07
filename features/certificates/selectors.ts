import type { CertificateStatus } from "@/features/certificates/types";

export function certificateStatusTone(status: CertificateStatus) {
  if (status === "active") return "success" as const;
  if (status === "revoked" || status === "expired") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

export function formatCertificateDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}

export function isCertificateExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}
