import { Award, Download, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type {
  CertificateDetails,
  CertificateListItem,
  PublicCertificateVerification
} from "@/features/certificates/types";
import { certificateStatusTone, formatCertificateDate } from "@/features/certificates/selectors";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, SuccessState } from "@/shared/ui/feedback";

export function CertificateList({ certificates }: { certificates: CertificateListItem[] }) {
  if (!certificates.length)
    return (
      <EmptyState
        description="Certificates issued from completed eligible courses and assessments will appear here."
        title="No certificates yet"
      />
    );
  return (
    <div className="certificate-grid">
      {certificates.map((certificate) => (
        <CertificateCard certificate={certificate} key={certificate.certificateId} />
      ))}
    </div>
  );
}

export function CertificateCard({ certificate }: { certificate: CertificateListItem }) {
  return (
    <Card className="certificate-card">
      <div className="student-card-heading">
        <span className="student-eyebrow">{certificate.certificateNumber}</span>
        <Badge tone={certificateStatusTone(certificate.status)}>{certificate.status}</Badge>
      </div>
      <h2>{certificate.courseTitle}</h2>
      <p>Issued by {certificate.issuerName}</p>
      <dl className="certificate-meta">
        <div>
          <dt>Issued</dt>
          <dd>{formatCertificateDate(certificate.issuedAt)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatCertificateDate(certificate.expiresAt)}</dd>
        </div>
      </dl>
      <Button asChild variant="secondary">
        <Link href={`/student/certificates/${certificate.certificateId}` as Route}>
          View certificate
        </Link>
      </Button>
    </Card>
  );
}

export function CertificateViewer({ certificate }: { certificate: CertificateDetails }) {
  return (
    <article className="certificate-viewer">
      <header>
        <div>
          <span className="student-eyebrow">Certificate {certificate.certificateNumber}</span>
          <h2>{certificate.courseTitle}</h2>
          <p>Awarded to {certificate.displayName}</p>
        </div>
        <Badge tone={certificateStatusTone(certificate.status)}>{certificate.status}</Badge>
      </header>
      <dl className="certificate-meta">
        <div>
          <dt>Issuer</dt>
          <dd>{certificate.issuerName}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{formatCertificateDate(certificate.issuedAt)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatCertificateDate(certificate.expiresAt)}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{certificate.achievement.policyVersion ?? "Published certificate policy"}</dd>
        </div>
      </dl>
      <CertificateState certificate={certificate} />
      <ul className="certificate-timeline">
        {certificate.events.map((event) => (
          <li key={`${event.status}-${event.effectiveAt}`}>
            <strong>{event.status}</strong>
            <p>
              {event.reasonCode}
              {" · "}
              {formatCertificateDate(event.effectiveAt)}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function CertificateState({ certificate }: { certificate: CertificateDetails }) {
  if (certificate.status === "revoked")
    return (
      <ErrorState
        description="This certificate has been revoked. The issuance record is retained for audit history."
        title="Certificate revoked"
      />
    );
  if (certificate.status === "expired")
    return (
      <ErrorState
        description="This certificate has expired. Historical issuance remains visible to you."
        title="Certificate expired"
      />
    );
  return (
    <SuccessState
      description="This certificate is active according to the current certificate lifecycle record."
      title="Certificate active"
    />
  );
}

export function DownloadActions({ certificate }: { certificate: CertificateDetails }) {
  const disabled = !certificate.artifactAvailable || certificate.status === "revoked";
  return (
    <div className="certificate-actions">
      <Button disabled={disabled} type="button" variant="primary">
        <Download aria-hidden="true" />
        Download
      </Button>
      {!certificate.artifactAvailable ? <p>Certificate artifact generation is pending.</p> : null}
    </div>
  );
}

export function VerificationSuccess({
  verification
}: {
  verification: PublicCertificateVerification;
}) {
  return (
    <section className="verification-panel">
      <header>
        <div>
          <span className="student-eyebrow">Verified certificate</span>
          <h1>{verification.courseTitle}</h1>
          <p>Awarded to {verification.holderDisplayName}</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </header>
      <Badge tone={certificateStatusTone(verification.status)}>{verification.status}</Badge>
      <dl className="certificate-meta">
        <div>
          <dt>Issuer</dt>
          <dd>{verification.issuerName}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{formatCertificateDate(verification.issuedOn)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatCertificateDate(verification.expiresOn)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function VerificationFailure() {
  return (
    <section className="verification-panel">
      <header>
        <div>
          <span className="student-eyebrow">Certificate verification</span>
          <h1>Certificate not verified</h1>
          <p>The supplied verification code does not match an active public verification record.</p>
        </div>
        <ShieldX aria-hidden="true" />
      </header>
    </section>
  );
}

export function CertificateLoading() {
  return (
    <Card className="certificate-card">
      <Award aria-hidden="true" />
      <p>Loading certificates</p>
    </Card>
  );
}
