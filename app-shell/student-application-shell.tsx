"use client";

import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  Flag,
  Gauge,
  Home,
  Search,
  TimerReset
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ApplicationShell } from "@/app-shell/application-shell";
import {
  AppFooter,
  Breadcrumb,
  NotificationTray,
  QuickSearch,
  WorkspaceSwitcher
} from "@/app-shell/navigation";
import type { StudentNotification } from "@/features/student/types";
import { NotificationCard } from "@/features/student/components/student-cards";
import { StudentEmpty } from "@/features/student/components/workspace-ui";

const navigation = [
  { href: "/student", icon: <Home />, label: "Home" },
  { href: "/student/learning", icon: <BookOpen />, label: "My learning" },
  { href: "/student/progress", icon: <Gauge />, label: "Progress" },
  { href: "/student/timeline", icon: <TimerReset />, label: "Timeline" },
  { href: "/student/goals", icon: <Flag />, label: "Goals" },
  { href: "/student/calendar", icon: <CalendarDays />, label: "Calendar" },
  { href: "/student/achievements", icon: <Award />, label: "Achievements" },
  { href: "/student/notifications", icon: <Bell />, label: "Notifications" },
  { href: "/student/search", icon: <Search />, label: "Search" }
];

export function StudentApplicationShell({
  children,
  notifications,
  userMenu,
  workspace
}: {
  children: ReactNode;
  notifications: StudentNotification[];
  userMenu: ReactNode;
  workspace: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = navigation.find((item) =>
    item.href === "/student" ? pathname === item.href : pathname.startsWith(item.href)
  );
  const unread = notifications.filter((item) => !item.readAt).length;
  return (
    <ApplicationShell
      breadcrumb={
        <Breadcrumb
          items={[{ href: "/student", label: "Student" }, { label: active?.label ?? "Workspace" }]}
        />
      }
      footer={
        <AppFooter
          links={[
            { href: "/student/bookmarks", label: "Bookmarks" },
            { href: "/student/downloads", label: "Downloads" }
          ]}
        />
      }
      navigation={navigation.map((item) => ({
        ...item,
        active: item.href === "/student" ? pathname === item.href : pathname.startsWith(item.href)
      }))}
      notifications={
        <NotificationTray count={unread}>
          {notifications.length ? (
            <div className="student-notification-list">
              {notifications.map((item) => (
                <NotificationCard key={item.notificationId} notification={item} />
              ))}
            </div>
          ) : (
            <StudentEmpty
              description="Learning updates and reminders will appear here."
              title="No notifications"
            />
          )}
        </NotificationTray>
      }
      search={<QuickSearch onOpen={() => router.push("/student/search" as Route)} />}
      userMenu={userMenu}
      workspace={<WorkspaceSwitcher>{workspace}</WorkspaceSwitcher>}
    >
      {children}
    </ApplicationShell>
  );
}
