import type { ReactNode } from "react";
import { AccountApplicationShell } from "@/app-shell/account-application-shell";
import { logout } from "@/features/auth/actions";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { listOrganizations } from "@/features/organizations/server";
import { resolveIdentityContext } from "@/features/session/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/theme/theme-toggle";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [context, organizations] = await Promise.all([
    resolveIdentityContext(),
    listOrganizations()
  ]);
  return (
    <ProtectedRoute>
      <AccountApplicationShell
        userMenu={
          <div className="syra-user-actions">
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        }
        workspace={
          <OrganizationSwitcher
            currentId={context?.organizationId ?? null}
            organizations={organizations}
          />
        }
      >
        {children}
      </AccountApplicationShell>
    </ProtectedRoute>
  );
}
