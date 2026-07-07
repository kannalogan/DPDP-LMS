export type CertificateStatus = "pending" | "active" | "expired" | "revoked" | "superseded";

export type CertificateListItem = {
  certificateId: string;
  certificateNumber: string;
  courseTitle: string;
  displayName: string;
  expiresAt: string | null;
  issuedAt: string;
  issuerName: string;
  status: CertificateStatus;
};

export type CertificateDetails = CertificateListItem & {
  achievement: {
    courseTitle?: string;
    policyVersion?: string;
  };
  artifactAvailable: boolean;
  events: CertificateStatusEvent[];
};

export type CertificateStatusEvent = {
  effectiveAt: string;
  reason: string | null;
  reasonCode: string;
  status: CertificateStatus;
};

export type CertificateDownloadDescriptor = {
  bucket: string | null;
  bytes: number | null;
  contentType: string | null;
  objectPath: string | null;
  sha256: string | null;
};

export type PublicCertificateVerification = {
  courseTitle: string;
  expiresOn: string | null;
  holderDisplayName: string;
  issuedOn: string;
  issuerName: string;
  status: CertificateStatus;
  updatedAt: string;
};
