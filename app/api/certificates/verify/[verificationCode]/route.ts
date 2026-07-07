import { NextResponse } from "next/server";
import { verificationCodeSchema } from "@/features/certificates/schemas";
import { verifyPublicCertificate } from "@/features/certificates/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ verificationCode: string }> }
) {
  const parsed = verificationCodeSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ verified: false }, { status: 404 });
  const verification = await verifyPublicCertificate(parsed.data.verificationCode);
  if (!verification) return NextResponse.json({ verified: false }, { status: 404 });
  return NextResponse.json({ certificate: verification, verified: true });
}
