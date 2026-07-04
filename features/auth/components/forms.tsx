import Link from "next/link";
import { login, register, requestPasswordReset, resetPassword } from "@/features/auth/actions";
import { ServerActionForm } from "@/features/auth/components/server-action-form";

export function LoginForm({ next = "/account/profile" }: { next?: string }) {
  return (
    <>
      <ServerActionForm
        action={login}
        fields={[
          { defaultValue: next, label: "Return path", name: "next", type: "hidden" },
          {
            autoComplete: "email",
            label: "Work email",
            name: "email",
            required: true,
            type: "email"
          },
          {
            autoComplete: "current-password",
            label: "Password",
            name: "password",
            required: true,
            type: "password"
          },
          { label: "Keep me signed in on this device", name: "rememberMe", type: "checkbox" }
        ]}
        submitLabel="Sign in"
      />
      <div className="identity-links">
        <Link href="/auth/forgot-password">Forgot password?</Link>
        <Link href="/auth/register">Create account</Link>
      </div>
    </>
  );
}

export function RegisterForm() {
  return (
    <>
      <ServerActionForm
        action={register}
        fields={[
          { autoComplete: "name", label: "Full name", name: "displayName", required: true },
          {
            autoComplete: "email",
            label: "Work email",
            name: "email",
            required: true,
            type: "email"
          },
          {
            autoComplete: "new-password",
            label: "Password",
            name: "password",
            required: true,
            type: "password"
          },
          {
            autoComplete: "new-password",
            label: "Confirm password",
            name: "confirmPassword",
            required: true,
            type: "password"
          },
          { defaultValue: "UTC", label: "Timezone", name: "timezone", required: true },
          { defaultValue: "en", label: "Language", name: "locale", required: true }
        ]}
        submitLabel="Create account"
      />
      <div className="identity-links">
        <Link href="/auth/login">Already have an account?</Link>
      </div>
    </>
  );
}

export function ForgotPasswordForm() {
  return (
    <>
      <ServerActionForm
        action={requestPasswordReset}
        fields={[
          {
            autoComplete: "email",
            label: "Work email",
            name: "email",
            required: true,
            type: "email"
          }
        ]}
        submitLabel="Send reset link"
      />
      <div className="identity-links">
        <Link href="/auth/login">Return to sign in</Link>
      </div>
    </>
  );
}

export function ResetPasswordForm() {
  return (
    <ServerActionForm
      action={resetPassword}
      fields={[
        {
          autoComplete: "new-password",
          label: "New password",
          name: "password",
          required: true,
          type: "password"
        },
        {
          autoComplete: "new-password",
          label: "Confirm new password",
          name: "confirmPassword",
          required: true,
          type: "password"
        }
      ]}
      submitLabel="Update password"
    />
  );
}
