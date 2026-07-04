"use client";

import { Building2, UserRound } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApplicationShell } from "@/app-shell/application-shell";
import {
  AppFooter,
  Breadcrumb,
  CommandBar,
  NotificationTray,
  QuickSearch,
  WorkspaceSwitcher
} from "@/app-shell/navigation";
import { EmptyState } from "@/shared/ui/feedback";

const destinations: Array<{ href: Route; icon: ReactNode; label: string }> = [
  { href: "/account/profile", icon: <UserRound />, label: "Profile" },
  { href: "/account/organizations", icon: <Building2 />, label: "Organizations" }
];

export function AccountApplicationShell({
  children,
  userMenu,
  workspace
}: {
  children: ReactNode;
  userMenu: ReactNode;
  workspace: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const active = destinations.find((item) => pathname.startsWith(item.href));
  const navigate = (href: Route) => {
    setCommandOpen(false);
    router.push(href);
  };

  return (
    <>
      <ApplicationShell
        breadcrumb={
          <Breadcrumb
            items={[
              { href: "/account/profile", label: "Account" },
              { label: active?.label ?? "Home" }
            ]}
          />
        }
        footer={
          <AppFooter
            links={[
              { href: "/account/profile", label: "Profile" },
              { href: "/account/organizations", label: "Organizations" }
            ]}
          />
        }
        navigation={destinations.map((item) => ({
          ...item,
          active: pathname.startsWith(item.href)
        }))}
        notifications={
          <NotificationTray>
            <EmptyState
              description="Updates for your account will appear here."
              title="No notifications"
            />
          </NotificationTray>
        }
        search={<QuickSearch onOpen={() => setCommandOpen(true)} />}
        userMenu={userMenu}
        workspace={<WorkspaceSwitcher>{workspace}</WorkspaceSwitcher>}
      >
        {children}
      </ApplicationShell>
      <CommandBar
        actions={destinations.map((item) => ({
          label: `Open ${item.label}`,
          onSelect: () => navigate(item.href)
        }))}
        onOpenChange={setCommandOpen}
        open={commandOpen}
      />
    </>
  );
}
