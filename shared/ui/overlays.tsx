"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui/button";
export function Dialog({
  children,
  description,
  onOpenChange,
  open,
  title
}: {
  children: ReactNode;
  description?: string;
  onOpenChange(open: boolean): void;
  open: boolean;
  title: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      className="ui-dialog"
      onCancel={() => onOpenChange(false)}
      onClose={() => onOpenChange(false)}
      ref={ref}
    >
      <header>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <Button
          aria-label="Close dialog"
          onClick={() => onOpenChange(false)}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="ui-dialog-body">{children}</div>
    </dialog>
  );
}
export function Drawer(props: Parameters<typeof Dialog>[0] & { side?: "left" | "right" }) {
  return (
    <div className={cn("ui-drawer-host", `from-${props.side ?? "right"}`)}>
      <Dialog {...props} />
    </div>
  );
}
export function Popover({
  children,
  content,
  label
}: {
  children: ReactNode;
  content: ReactNode;
  label: string;
}) {
  return (
    <details className="ui-popover">
      <summary aria-label={label}>{children}</summary>
      <div className="ui-popover-content">{content}</div>
    </details>
  );
}
export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <span className="ui-tooltip" data-tooltip={content}>
      {children}
    </span>
  );
}
export function Dropdown({
  items,
  label,
  trigger
}: {
  items: Array<{ disabled?: boolean; label: string; onSelect(): void }>;
  label: string;
  trigger: ReactNode;
}) {
  return (
    <details className="ui-dropdown">
      <summary aria-label={label}>{trigger}</summary>
      <div role="menu">
        {items.map((item) => (
          <button
            disabled={item.disabled}
            key={item.label}
            onClick={item.onSelect}
            role="menuitem"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
export function ApprovalDialog({
  actionLabel,
  children,
  onApprove,
  ...props
}: Parameters<typeof Dialog>[0] & { actionLabel: string; onApprove(): void }) {
  return (
    <Dialog {...props}>
      <div className="ui-approval">
        {children}
        <div className="ui-dialog-actions">
          <Button onClick={() => props.onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onApprove}>{actionLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}
