"use client";
import { AlertCircle, CheckCircle2, CloudOff, Inbox, LoaderCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={cn("ui-badge", `ui-badge-${tone}`)}>{children}</span>;
}
export function Chip({ children, onRemove }: { children: ReactNode; onRemove?(): void }) {
  return (
    <span className="ui-chip">
      {children}
      {onRemove ? (
        <button aria-label="Remove" onClick={onRemove} type="button">
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
export function Progress({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress">
      <div>
        <span>{label}</span>
        <span>{safe}%</span>
      </div>
      <progress aria-label={label} max={100} value={safe} />
    </div>
  );
}
export function ProgressRing({
  label,
  size = "md",
  value
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  value: number;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-label={`${label}: ${safe}%`}
      className={cn("ui-progress-ring", `ui-progress-ring-${size}`)}
      role="img"
    >
      <svg aria-hidden="true" viewBox="0 0 36 36">
        <path
          className="ring-track"
          d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
        />
        <path
          className="ring-value"
          pathLength="100"
          strokeDasharray={`${safe} 100`}
          d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
        />
      </svg>
      <strong>{safe}%</strong>
    </div>
  );
}
function State({
  action,
  description,
  icon: Icon,
  title,
  tone
}: {
  action?: ReactNode;
  description: string;
  icon: typeof Inbox;
  title: string;
  tone: string;
}) {
  return (
    <section className={cn("ui-state", tone)}>
      <Icon aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}
export function EmptyState({
  action,
  description,
  title
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <State action={action} description={description} icon={Inbox} title={title} tone="is-empty" />
  );
}
export function ErrorState({
  action,
  description,
  title = "Something went wrong"
}: {
  action?: ReactNode;
  description: string;
  title?: string;
}) {
  return (
    <State
      action={action}
      description={description}
      icon={AlertCircle}
      title={title}
      tone="is-error"
    />
  );
}
export function SuccessState({
  action,
  description,
  title
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <State
      action={action}
      description={description}
      icon={CheckCircle2}
      title={title}
      tone="is-success"
    />
  );
}
export function OfflineState({
  action,
  description = "Reconnect to continue.",
  title = "You are offline"
}: {
  action?: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <State
      action={action}
      description={description}
      icon={CloudOff}
      title={title}
      tone="is-offline"
    />
  );
}
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-live="polite" className="ui-loading">
      <LoaderCircle aria-hidden="true" className="ui-spin" />
      <span>{label}</span>
    </div>
  );
}
export function SkeletonState({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading" className="ui-skeleton-stack">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton className={index === 0 ? "h-6 w-2/5" : "h-12 w-full"} key={index} />
      ))}
    </div>
  );
}
export function AsyncBoundary({
  children,
  empty,
  error,
  loading,
  success
}: {
  children: ReactNode;
  empty?: boolean;
  error?: string;
  loading?: boolean;
  success?: string;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error} />;
  if (empty) return <EmptyState description="No items match this view." title="Nothing here yet" />;
  return (
    <>
      {success ? (
        <div className="sr-only" role="status">
          {success}
        </div>
      ) : null}
      {children}
    </>
  );
}
type Toast = { id: string; message: string; tone: "neutral" | "success" | "danger" };
const ToastContext = createContext<{
  dismiss(id: string): void;
  push(message: string, tone?: Toast["tone"]): void;
} | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback(
    (id: string) => setToasts((items) => items.filter((item) => item.id !== id)),
    []
  );
  const push = useCallback(
    (message: string, tone: Toast["tone"] = "neutral") =>
      setToasts((items) => [...items, { id: crypto.randomUUID(), message, tone }]),
    []
  );
  const value = useMemo(() => ({ dismiss, push }), [dismiss, push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="ui-toasts">
        {toasts.map((toast) => (
          <div className={cn("ui-toast", `ui-toast-${toast.tone}`)} key={toast.id}>
            <span>{toast.message}</span>
            <Button
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
