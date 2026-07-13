import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { logout } from "@/features/auth/actions";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { Button } from "@/shared/ui/button";
import "@/features/student/student.css";
import "@/features/admin/admin.css";
import "@/features/course-authoring/authoring.css";
import "@/features/question-authoring/question-authoring.css";
import "@/features/reporting/reporting.css";

const links = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/organizations", "Organizations"],
  ["/admin/users", "Users"],
  ["/admin/invitations", "Invitations"],
  ["/admin/domains", "Domains"],
  ["/admin/security", "Security"],
  ["/admin/settings", "Settings"],
  ["/admin/branding", "Branding"],
  ["/admin/announcements", "Announcements"],
  ["/admin/authoring", "Authoring"],
  ["/admin/question-bank", "Question bank"],
  ["/admin/reports", "Reports"]
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="admin-shell">
        <nav aria-label="Admin workspace" className="admin-nav">
          {links.map(([href, label]) => (
            <Link href={href as Route} key={href}>
              {label}
            </Link>
          ))}
          <form action={logout}>
            <Button size="sm" type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </nav>
        {children}
      </div>
    </ProtectedRoute>
  );
}
