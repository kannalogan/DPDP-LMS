import { VerificationFailure, VerificationSuccess } from "@/features/certificates/components";
import { verificationCodeSchema } from "@/features/certificates/schemas";
import { verifyPublicCertificate } from "@/features/certificates/server";

export default async function CertificateVerificationPage({
  params
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const parsed = verificationCodeSchema.safeParse(await params);
  const verification = parsed.success
    ? await verifyPublicCertificate(parsed.data.verificationCode)
    : null;
  return (
    <main className="verification-shell">
      {verification ? <VerificationSuccess verification={verification} /> : <VerificationFailure />}
    </main>
  );
}
