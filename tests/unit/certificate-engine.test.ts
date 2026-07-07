import { describe, expect, it } from "vitest";
import { mapCertificateDetails, mapPublicVerification } from "@/features/certificates/mappers";
import { certificateDownloadSchema, verificationCodeSchema } from "@/features/certificates/schemas";
import { certificateStatusTone, formatCertificateDate } from "@/features/certificates/selectors";

describe("certificate engine", () => {
  it("maps certificate rows into UI DTOs without raw database rows", () => {
    const certificate = mapCertificateDetails(
      {
        achievement_snapshot: { courseTitle: "DPDP Essentials", policyVersion: "policy-v1" },
        artifact_object_id: "asset",
        certificate_number: "SYRA-2026-0001",
        current_status: "active",
        display_name_snapshot: "Learner One",
        expires_at: null,
        id: "certificate-id",
        issued_at: "2026-07-07T00:00:00.000Z",
        organizations: { name: "SYRA" }
      },
      [{ effective_at: "2026-07-07T00:00:00.000Z", reason_code: "issued", status: "active" }]
    );
    expect(certificate).toMatchObject({
      artifactAvailable: true,
      certificateNumber: "SYRA-2026-0001",
      courseTitle: "DPDP Essentials",
      displayName: "Learner One",
      issuerName: "SYRA",
      status: "active"
    });
    expect(certificate).not.toHaveProperty("public_token_hash");
  });

  it("maps public verification projection without leaking internal identifiers", () => {
    const verification = mapPublicVerification({
      course_title: "Compliance Exam",
      expires_on: null,
      holder_display_name: "Learner One",
      issued_on: "2026-07-07",
      issuer_name: "SYRA",
      organization_id: "forbidden",
      status: "active",
      updated_at: "2026-07-07T00:00:00.000Z"
    });
    expect(verification).toEqual({
      courseTitle: "Compliance Exam",
      expiresOn: null,
      holderDisplayName: "Learner One",
      issuedOn: "2026-07-07",
      issuerName: "SYRA",
      status: "active",
      updatedAt: "2026-07-07T00:00:00.000Z"
    });
    expect(verification).not.toHaveProperty("organization_id");
  });

  it("validates verification and download commands", () => {
    expect(verificationCodeSchema.safeParse({ verificationCode: "x".repeat(32) }).success).toBe(
      true
    );
    expect(verificationCodeSchema.safeParse({ verificationCode: "short" }).success).toBe(false);
    expect(
      certificateDownloadSchema.safeParse({
        certificateId: "00000000-0000-4000-8000-000000000001",
        requestId: "download-request"
      }).success
    ).toBe(true);
  });

  it("formats certificate status and dates", () => {
    expect(certificateStatusTone("active")).toBe("success");
    expect(certificateStatusTone("revoked")).toBe("danger");
    expect(formatCertificateDate(null)).toBe("No expiry");
  });
});
