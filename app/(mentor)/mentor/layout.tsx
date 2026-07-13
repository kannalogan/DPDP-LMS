import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { logout } from "@/features/auth/actions";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { Button } from "@/shared/ui/button";
import "@/features/student/student.css";
import "@/features/mentor/mentor.css";
import "@/features/course-authoring/authoring.css";
import "@/features/question-authoring/question-authoring.css";

const links = [
  ["/mentor/dashboard", "Dashboard"],
  ["/mentor/learners", "Learners"],
  ["/mentor/cohorts", "Cohorts"],
  ["/mentor/reviews", "Reviews"],
  ["/mentor/tasks", "Tasks"],
  ["/mentor/announcements", "Announcements"],
  ["/mentor/authoring", "Authoring"],
  ["/mentor/question-bank", "Question bank"]
] as const;

export default async function MentorLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="mentor-shell">
        <nav aria-label="Mentor workspace" className="mentor-nav">
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
