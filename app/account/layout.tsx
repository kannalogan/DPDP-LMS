import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/features/auth/actions";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { listOrganizations } from "@/features/organizations/server";
import { resolveIdentityContext } from "@/features/session/server";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [context, organizations] = await Promise.all([
    resolveIdentityContext(),
    listOrganizations()
  ]);
  return (
    <ProtectedRoute>
      <div className="account-shell">
        <header className="account-header">
          <Link className="identity-brand" href="/account/profile">
            <span aria-hidden="true" className="identity-mark">
              S
            </span>
            <span>SYRA</span>
          </Link>
          <nav aria-label="Account navigation">
            <Link href="/account/profile">Profile</Link>
            <Link href="/account/organizations">Organizations</Link>
          </nav>
          <OrganizationSwitcher
            currentId={context?.organizationId ?? null}
            organizations={organizations}
          />
          <form action={logout}>
            <Button className="secondary-button" type="submit">
              Sign out
            </Button>
          </form>
        </header>
        <main className="account-content">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
