import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/forms";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/account/profile";
  return (
    <AuthShell description="Use your verified SYRA identity to continue." title="Welcome back">
      <LoginForm next={safeNext} />
    </AuthShell>
  );
}
