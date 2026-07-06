import { AlertTriangle, LockKeyhole, WifiOff } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { StudentDataStatus, StudentProfileSummary } from "@/features/student/types";
import { Avatar, Card } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, SkeletonState } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";

export function StudentPageHeader({
  actions,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="student-page-header">
      <div>
        {eyebrow ? <span className="student-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="student-page-actions">{actions}</div> : null}
    </header>
  );
}

export function WelcomeHeader({ profile }: { profile: StudentProfileSummary }) {
  return (
    <header className="student-welcome">
      <div>
        <span className="student-eyebrow">Your learning workspace</span>
        <h1>Welcome back, {profile.name}</h1>
        <p>
          {profile.currentOrganization
            ? `Learning with ${profile.currentOrganization}`
            : "Choose an organization to see assigned learning."}
        </p>
      </div>
      <Avatar alt={profile.name} fallback={profile.name} size="lg" src={profile.avatarUrl} />
    </header>
  );
}

export function ProfileSummary({ profile }: { profile: StudentProfileSummary }) {
  return (
    <Card className="student-profile-summary">
      <Avatar alt={profile.name} fallback={profile.name} size="lg" src={profile.avatarUrl} />
      <div>
        <h2>{profile.name}</h2>
        <p>{profile.currentOrganization ?? "No active organization"}</p>
        <p>{profile.currentTrack ?? "No learning track assigned"}</p>
      </div>
      <div className="student-profile-metrics">
        <span>
          XP <strong>{profile.xp ?? "—"}</strong>
        </span>
        <span>
          Level <strong>{profile.level ?? "—"}</strong>
        </span>
        <span>
          Rank <strong>{profile.rank ?? "—"}</strong>
        </span>
        <span>
          Badges <strong>{profile.badges ?? "—"}</strong>
        </span>
      </div>
    </Card>
  );
}

export function StudentServiceNotice({
  reason,
  status
}: {
  reason: string | null;
  status: StudentDataStatus;
}) {
  if (status === "available") return null;
  return (
    <section className="student-service-notice" role="status">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>
          {status === "partial"
            ? "Some workspace data is unavailable"
            : "Learning service is being prepared"}
        </strong>
        <p>{reason}</p>
      </div>
    </section>
  );
}

export function StudentPermissionError() {
  return (
    <ErrorState
      action={
        <Button asChild variant="secondary">
          <Link href="/account/organizations">Review organization</Link>
        </Button>
      }
      description="Your active organization has not granted platform access. Choose another organization or contact an administrator."
      title="Permission required"
    />
  );
}

export function StudentExpiredSessionError() {
  return (
    <ErrorState
      action={
        <Button asChild>
          <Link href="/auth/login?next=/student">Sign in again</Link>
        </Button>
      }
      description="Your verified session is no longer available. Sign in again to protect your learning record."
      title="Session expired"
    />
  );
}

export function StudentUnavailableError({ description }: { description: string }) {
  return (
    <ErrorState
      action={<WifiOff aria-hidden="true" />}
      description={description}
      title="Learning service unavailable"
    />
  );
}

export function StudentEmpty({
  actionHref,
  actionLabel,
  description,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <EmptyState
      action={
        actionHref && actionLabel ? (
          <Button asChild variant="secondary">
            <Link href={actionHref as Route}>{actionLabel}</Link>
          </Button>
        ) : undefined
      }
      description={description}
      title={title}
    />
  );
}

export function StudentSection({
  action,
  children,
  description,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="student-section">
      <header>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StudentWorkspaceSkeleton() {
  return (
    <div className="student-workspace-loading">
      <span className="sr-only" role="status">
        Loading student workspace
      </span>
      <SkeletonState rows={5} />
    </div>
  );
}

export function StudentStatusLegend() {
  return (
    <div className="student-status-legend" aria-label="Learning status">
      <Badge>Not started</Badge>
      <Badge tone="info">In progress</Badge>
      <Badge tone="success">Completed</Badge>
      <LockKeyhole aria-label="Locked content requires prerequisites" />
    </div>
  );
}
