import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forms";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="We will send recovery instructions if the account exists."
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
