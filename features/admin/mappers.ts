import type {
  AdminAnnouncement,
  AdminDashboardMetrics,
  AdminDomain,
  AdminInvitation,
  AdminOrganizationOverview
} from "@/features/admin/types";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function mapOrganization(row: Row): AdminOrganizationOverview {
  return {
    activeMembers: number(row.active_members),
    lastAdminEventAt: nullableText(row.last_admin_event_at),
    name: text(row.name, "Organization"),
    organizationId: text(row.organization_id),
    pendingInvitations: number(row.pending_invitations),
    slug: text(row.slug),
    status: text(row.status),
    type: text(row.type),
    verifiedDomains: number(row.verified_domains)
  };
}

export function summarizeMetrics(rows: Row[]): AdminDashboardMetrics {
  return rows.reduce<AdminDashboardMetrics>(
    (metrics, row) => ({
      activeMembers: metrics.activeMembers + number(row.active_members),
      criticalEvents: metrics.criticalEvents + number(row.critical_events),
      lastEventAt: nullableText(row.last_event_at) ?? metrics.lastEventAt,
      pendingDomains: metrics.pendingDomains + number(row.pending_domains),
      pendingInvitations: metrics.pendingInvitations + number(row.pending_invitations)
    }),
    {
      activeMembers: 0,
      criticalEvents: 0,
      lastEventAt: null,
      pendingDomains: 0,
      pendingInvitations: 0
    }
  );
}

export function mapInvitation(row: Row): AdminInvitation {
  return {
    createdAt: text(row.created_at),
    expiresAt: text(row.expires_at),
    invitationId: text(row.id),
    status: text(row.status)
  };
}

export function mapDomain(row: Row): AdminDomain {
  return {
    domain: text(row.domain),
    domainId: text(row.id),
    expiresAt: nullableText(row.expires_at),
    status: text(row.verification_status),
    verifiedAt: nullableText(row.verified_at)
  };
}

export function mapAnnouncement(row: Row): AdminAnnouncement {
  return {
    announcementId: text(row.id),
    publishAt: text(row.publish_at),
    status: text(row.status),
    title: text(row.title)
  };
}
