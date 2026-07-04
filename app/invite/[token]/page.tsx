import { AuthShell } from "@/features/auth/components/auth-shell";
import { InvitationAcceptForm } from "@/features/organizations/components/invitation-accept-form";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell
      description="Membership and role grants are validated when you accept."
      title="Join your organization"
    >
      <InvitationAcceptForm token={token} />
    </AuthShell>
  );
}
