export type AdminOrganizationOverview = {
  activeMembers: number;
  lastAdminEventAt: string | null;
  name: string;
  organizationId: string;
  pendingInvitations: number;
  slug: string;
  status: string;
  type: string;
  verifiedDomains: number;
};

export type AdminDashboardMetrics = {
  activeMembers: number;
  criticalEvents: number;
  lastEventAt: string | null;
  pendingDomains: number;
  pendingInvitations: number;
};

export type AdminInvitation = {
  createdAt: string;
  expiresAt: string;
  invitationId: string;
  status: string;
};

export type AdminDomain = {
  domain: string;
  domainId: string;
  expiresAt: string | null;
  status: string;
  verifiedAt: string | null;
};

export type AdminAnnouncement = {
  announcementId: string;
  publishAt: string;
  status: string;
  title: string;
};

export type AdminWorkspaceData = {
  announcements: AdminAnnouncement[];
  domains: AdminDomain[];
  invitations: AdminInvitation[];
  metrics: AdminDashboardMetrics;
  organizations: AdminOrganizationOverview[];
};
