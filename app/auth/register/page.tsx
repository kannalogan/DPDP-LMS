import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/forms";

export default function RegisterPage() {
  return (
    <AuthShell
      description="Create your identity. Organization access is granted separately."
      title="Create your SYRA account"
    >
      <RegisterForm />
    </AuthShell>
  );
}
