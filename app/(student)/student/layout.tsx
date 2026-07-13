import Link from "next/link";
import type { ReactNode } from "react";
import { StudentApplicationShell } from "@/app-shell/student-application-shell";
import { logout } from "@/features/auth/actions";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { listOrganizations } from "@/features/organizations/server";
import { getStudentWorkspace } from "@/features/student/server";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import "@/features/student/student.css";
import "@/features/learning-delivery/delivery.css";
import "@/features/assessment-engine/assessment.css";
import "@/features/certificates/certificates.css";
import "@/features/assignments/assignments.css";
import "@/features/notifications/notifications.css";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const [data, organizations] = await Promise.all([getStudentWorkspace(), listOrganizations()]);
  return (
    <ProtectedRoute>
      <StudentApplicationShell
        notifications={data?.notifications ?? []}
        userMenu={
          <div className="syra-user-actions">
            <ThemeToggle />
            <Button asChild size="sm" variant="ghost">
              <Link href="/account/profile">Profile</Link>
            </Button>
            <form action={logout}>
              <Button size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        }
        workspace={
          <OrganizationSwitcher
            currentId={data?.profile.currentOrganizationId ?? null}
            organizations={organizations}
          />
        }
      >
        {children}
      </StudentApplicationShell>
    </ProtectedRoute>
  );
}
