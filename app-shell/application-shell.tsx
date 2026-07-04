"use client";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui/button";
export interface ShellNavigationItem {
  active?: boolean;
  href: string;
  icon?: ReactNode;
  label: string;
}
export function ApplicationShell({
  assistant,
  breadcrumb,
  children,
  footer,
  navigation,
  notifications,
  search,
  userMenu,
  workspace
}: {
  assistant?: ReactNode;
  breadcrumb?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  navigation: ShellNavigationItem[];
  notifications?: ReactNode;
  search?: ReactNode;
  userMenu?: ReactNode;
  workspace?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={cn("syra-shell", collapsed && "is-collapsed", mobileOpen && "is-mobile-open")}>
      <aside className="syra-sidebar">
        <div className="syra-sidebar-head">
          <span className="syra-logo">S</span>
          {collapsed ? null : <strong>SYRA</strong>}
          <Button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
            size="icon"
            variant="ghost"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        {workspace}
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <a aria-current={item.active ? "page" : undefined} href={item.href} key={item.href}>
              {item.icon}
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <span>{item.label}</span>
              )}
            </a>
          ))}
        </nav>
        {footer ? <div className="syra-sidebar-foot">{footer}</div> : null}
      </aside>
      <div className="syra-main">
        <header className="syra-topbar">
          <Button
            aria-label="Open navigation"
            className="syra-mobile-menu"
            onClick={() => setMobileOpen((value) => !value)}
            size="icon"
            variant="ghost"
          >
            <Menu />
          </Button>
          <div className="syra-breadcrumb-slot">{breadcrumb}</div>
          <div className="syra-command-slot">{search}</div>
          {notifications}
          {userMenu}
        </header>
        <main className="syra-content">{children}</main>
      </div>
      {assistant}
    </div>
  );
}
