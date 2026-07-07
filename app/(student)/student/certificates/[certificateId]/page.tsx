import { notFound } from "next/navigation";
import { CertificateViewer, DownloadActions } from "@/features/certificates/components";
import { certificateIdSchema } from "@/features/certificates/schemas";
import { canAccessCertificates, getLearnerCertificate } from "@/features/certificates/server";
import {
  StudentPageHeader,
  StudentPermissionError,
  StudentSection
} from "@/features/student/components/workspace-ui";

export default async function StudentCertificateDetailsPage({
  params
}: {
  params: Promise<{ certificateId: string }>;
}) {
  if (!(await canAccessCertificates())) return <StudentPermissionError />;
  const parsed = certificateIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const certificate = await getLearnerCertificate(parsed.data.certificateId);
  if (!certificate) notFound();
  return (
    <>
      <StudentPageHeader
        description="Certificate issuance facts are immutable. Revocations and expiry are appended as lifecycle evidence."
        eyebrow="Credential record"
        title={certificate.courseTitle}
      />
      <StudentSection title="Certificate">
        <CertificateViewer certificate={certificate} />
      </StudentSection>
      <StudentSection title="Download">
        <DownloadActions certificate={certificate} />
      </StudentSection>
    </>
  );
}
