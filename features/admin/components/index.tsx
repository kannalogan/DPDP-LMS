import { Building2, Globe2, Megaphone, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type {
  AdminAnnouncement,
  AdminDomain,
  AdminInvitation,
  AdminOrganizationOverview,
  AdminWorkspaceData
} from "@/features/admin/types";
import { adminStatusTone, formatAdminDate } from "@/features/admin/selectors";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";

export function AdminPageHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="student-page-header">
      <div>
        <span className="student-eyebrow">Admin workspace</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function AdminPermissionDenied() {
  return (
    <ErrorState
      description="Your active organization does not grant administrative workspace access."
      title="Admin access required"
    />
  );
}

export function AdminDashboard({ data }: { data: AdminWorkspaceData }) {
  return (
    <div className="admin-shell">
      <AdminMetricsCards data={data} />
      <div className="admin-grid">
        <OrganizationTable organizations={data.organizations.slice(0, 6)} />
        <InvitationTable invitations={data.invitations.slice(0, 6)} />
        <DomainVerification domains={data.domains.slice(0, 6)} />
        <AnnouncementManager announcements={data.announcements.slice(0, 6)} />
      </div>
      <RecentActivity data={data} />
    </div>
  );
}

export function AdminMetricsCards({ data }: { data: AdminWorkspaceData }) {
  const stats = [
    ["Active members", data.metrics.activeMembers, <Users key="members" />],
    ["Pending invitations", data.metrics.pendingInvitations, <Building2 key="invites" />],
    ["Pending domains", data.metrics.pendingDomains, <Globe2 key="domains" />],
    ["Critical events", data.metrics.criticalEvents, <ShieldCheck key="events" />]
  ] as const;
  return (
    <section className="admin-grid">
      {stats.map(([label, value, icon]) => (
        <Card className="admin-card admin-stat" key={label}>
          <div className="student-card-heading">
            <span className="student-eyebrow">{label}</span>
            {icon}
          </div>
          <strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}

export function OrganizationTable({
  organizations
}: {
  organizations: AdminOrganizationOverview[];
}) {
  return (
    <Card className="admin-panel">
      <h2>Organizations</h2>
      <ResponsiveAdminControls />
      <Table
        caption="Organizations"
        columns={[
          { header: "Name", key: "name", render: (row) => row.name },
          {
            header: "Status",
            key: "status",
            render: (row) => <Badge tone={adminStatusTone(row.status)}>{row.status}</Badge>
          },
          { header: "Members", key: "members", render: (row) => row.activeMembers },
          {
            header: "Open",
            key: "open",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/organizations/${row.organizationId}` as Route}>Open</Link>
              </Button>
            )
          }
        ]}
        emptyMessage="No organizations available"
        rows={organizations}
      />
    </Card>
  );
}

export function OrganizationDetail({ organization }: { organization: AdminOrganizationOverview }) {
  return (
    <Card className="admin-panel">
      <div className="student-card-heading">
        <h2>{organization.name}</h2>
        <Badge tone={adminStatusTone(organization.status)}>{organization.status}</Badge>
      </div>
      <p>{organization.slug}</p>
      <div className="admin-grid">
        <AdminFact label="Active members" value={organization.activeMembers} />
        <AdminFact label="Pending invitations" value={organization.pendingInvitations} />
        <AdminFact label="Verified domains" value={organization.verifiedDomains} />
      </div>
    </Card>
  );
}

export function InvitationTable({ invitations }: { invitations: AdminInvitation[] }) {
  if (!invitations.length)
    return (
      <EmptyState
        description="Pending invitations will appear after admins create them."
        title="Invitations"
      />
    );
  return (
    <Card className="admin-panel">
      <h2>Invitations</h2>
      <div className="admin-list">
        {invitations.map((item) => (
          <article className="admin-list-item" key={item.invitationId}>
            <div className="student-card-heading">
              <strong>{formatAdminDate(item.createdAt)}</strong>
              <Badge tone={adminStatusTone(item.status)}>{item.status}</Badge>
            </div>
            <p>Expires {formatAdminDate(item.expiresAt)}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function InvitationDialog() {
  return (
    <Card className="admin-panel">
      <h2>Invitation dialog</h2>
      <p>
        Invitation creation is protected by the `create_organization_invitation` RPC and server
        action validation.
      </p>
    </Card>
  );
}

export function BrandingEditor() {
  return (
    <Card className="admin-panel">
      <h2>Branding editor</h2>
      <p>Branding updates are saved through the controlled `update_branding` RPC.</p>
    </Card>
  );
}

export function DomainVerification({ domains }: { domains: AdminDomain[] }) {
  if (!domains.length)
    return (
      <EmptyState description="Verified and pending domains will appear here." title="Domains" />
    );
  return (
    <Card className="admin-panel">
      <h2>Domain verification</h2>
      <div className="admin-list">
        {domains.map((domain) => (
          <article className="admin-list-item" key={domain.domainId}>
            <div className="student-card-heading">
              <strong>{domain.domain}</strong>
              <Badge tone={adminStatusTone(domain.status)}>{domain.status}</Badge>
            </div>
            <p>
              {domain.verifiedAt
                ? `Verified ${formatAdminDate(domain.verifiedAt)}`
                : "Verification pending"}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function SecuritySettings() {
  return (
    <Card className="admin-panel">
      <h2>Security settings</h2>
      <p>MFA, session timeout and password policy updates use `update_security_settings`.</p>
    </Card>
  );
}

export function AnnouncementManager({ announcements }: { announcements: AdminAnnouncement[] }) {
  if (!announcements.length)
    return (
      <EmptyState
        description="Published platform announcements will appear here."
        title="Announcements"
      />
    );
  return (
    <Card className="admin-panel">
      <div className="student-card-heading">
        <h2>Announcements</h2>
        <Megaphone aria-hidden="true" />
      </div>
      <div className="admin-list">
        {announcements.map((announcement) => (
          <article className="admin-list-item" key={announcement.announcementId}>
            <strong>{announcement.title}</strong>
            <Badge tone={adminStatusTone(announcement.status)}>{announcement.status}</Badge>
            <p>{formatAdminDate(announcement.publishAt)}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function RecentActivity({ data }: { data: AdminWorkspaceData }) {
  return (
    <Card className="admin-panel">
      <h2>Recent activity</h2>
      <p>
        {data.metrics.lastEventAt
          ? formatAdminDate(data.metrics.lastEventAt)
          : "No admin dashboard events recorded."}
      </p>
    </Card>
  );
}

export function AuditTimeline() {
  return (
    <Card className="admin-panel">
      <h2>Audit timeline</h2>
      <p>
        Immutable audit evidence remains in `audit_events`; this view shows admin-safe dashboard
        events only.
      </p>
    </Card>
  );
}

export function ConfirmationDialog() {
  return (
    <Card className="admin-panel">
      <h2>Confirmation</h2>
      <p>
        High-risk admin actions are confirmed before their server action invokes a controlled RPC.
      </p>
    </Card>
  );
}

export function ResponsiveAdminControls() {
  return (
    <div className="admin-filters">
      <Badge>Search</Badge>
      <Badge>Filters</Badge>
      <Badge>Pagination</Badge>
    </div>
  );
}

export function AdminLoading() {
  return <LoadingState label="Loading admin workspace" />;
}

function AdminFact({ label, value }: { label: string; value: number }) {
  return (
    <Card className="admin-card admin-stat">
      <span className="student-eyebrow">{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}
