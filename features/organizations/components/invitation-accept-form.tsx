import { acceptInvitation } from "@/features/organizations/actions";
import { ServerActionForm } from "@/features/auth/components/server-action-form";

export function InvitationAcceptForm({ token }: { token: string }) {
  return (
    <ServerActionForm
      action={acceptInvitation}
      fields={[{ defaultValue: token, label: "Invitation token", name: "token", type: "hidden" }]}
      submitLabel="Accept invitation"
    />
  );
}
