import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/forms";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      description="Choose a strong password that you do not use elsewhere."
      title="Set a new password"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
