"use client";
import { Bell, Bot, Command, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/shared/ui/data-display";
import { Button } from "@/shared/ui/button";
import { Dialog, Drawer, Dropdown } from "@/shared/ui/overlays";
import { SearchInput } from "@/shared/ui/forms";
export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="syra-breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function CommandBar({
  actions,
  open,
  onOpenChange
}: {
  actions: Array<{ label: string; onSelect(): void; shortcut?: string }>;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <Dialog
      description="Search and run available commands."
      onOpenChange={onOpenChange}
      open={open}
      title="Command bar"
    >
      <SearchInput autoFocus placeholder="Type a command" />
      <div className="command-results">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onSelect} type="button">
            <span>{action.label}</span>
            {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
export function QuickSearch({ onOpen }: { onOpen(): void }) {
  return (
    <button className="quick-search" onClick={onOpen} type="button">
      <Search className="size-4" />
      <span>Search</span>
      <kbd>
        <Command className="size-3" />K
      </kbd>
    </button>
  );
}
export function WorkspaceSwitcher({ children }: { children: ReactNode }) {
  return <div className="workspace-switcher">{children}</div>;
}
export function UserMenu({
  email,
  name,
  onSignOut
}: {
  email: string;
  name: string;
  onSignOut(): void;
}) {
  return (
    <Dropdown
      label="User menu"
      trigger={<Avatar alt={name} fallback={name} size="sm" />}
      items={[
        { label: email, disabled: true, onSelect() {} },
        {
          label: "Profile settings",
          onSelect() {
            location.assign("/account/profile");
          }
        },
        { label: "Sign out", onSelect: onSignOut }
      ]}
    />
  );
}
export function NotificationTray({ children, count = 0 }: { children: ReactNode; count?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        onClick={() => setOpen(true)}
        size="icon"
        variant="ghost"
      >
        <Bell />
        {count ? <span className="notification-count">{count}</span> : null}
      </Button>
      <Drawer onOpenChange={setOpen} open={open} side="right" title="Notifications">
        {children}
      </Drawer>
    </>
  );
}
export function AiAssistantDock({
  children,
  open,
  onOpenChange
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  return (
    <aside className={open ? "ai-dock is-open" : "ai-dock"} aria-label="AI assistant">
      <Button
        aria-expanded={open}
        aria-label="Toggle AI assistant"
        onClick={() => onOpenChange(!open)}
        size="icon"
      >
        <Bot />
      </Button>
      {open ? <div>{children}</div> : null}
    </aside>
  );
}
export function AppFooter({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} SYRA</span>
      <nav aria-label="Footer">
        {links.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
