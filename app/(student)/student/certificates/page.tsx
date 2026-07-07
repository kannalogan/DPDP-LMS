import { CertificateList } from "@/features/certificates/components";
import { canAccessCertificates, getLearnerCertificates } from "@/features/certificates/server";
import {
  StudentPageHeader,
  StudentPermissionError,
  StudentSection
} from "@/features/student/components/workspace-ui";

export default async function StudentCertificatesPage() {
  if (!(await canAccessCertificates())) return <StudentPermissionError />;
  const certificates = await getLearnerCertificates();
  return (
    <>
      <StudentPageHeader
        description="View issued credentials, lifecycle status, expiry dates, and downloadable certificate artifacts."
        eyebrow="Credentials"
        title="Certificates"
      />
      <StudentSection title="Issued certificates">
        <CertificateList certificates={certificates} />
      </StudentSection>
    </>
  );
}
