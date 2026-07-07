import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAnnouncement,
  mapDomain,
  mapInvitation,
  mapOrganization,
  summarizeMetrics
} from "@/features/admin/mappers";
import type { AdminWorkspaceData } from "@/features/admin/types";

export class SupabaseAdminRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string
  ) {}

  async getWorkspace(): Promise<AdminWorkspaceData> {
    const [organizations, metricsRows, invitations, domains, announcements] = await Promise.all([
      this.getOrganizations(),
      this.getDashboardRows(),
      this.getInvitations(),
      this.getDomains(),
      this.getAnnouncements()
    ]);
    return {
      announcements,
      domains,
      invitations,
      metrics: summarizeMetrics(metricsRows),
      organizations
    };
  }

  async getOrganizations() {
    const { data, error } = await this.client
      .from("admin_organization_overview")
      .select("*")
      .order("name");
    if (error) return [];
    return (data ?? []).map((row) => mapOrganization(row as Record<string, unknown>));
  }

  async getOrganization(organizationId: string) {
    const organizations = await this.getOrganizations();
    return organizations.find((item) => item.organizationId === organizationId) ?? null;
  }

  async getDashboardRows() {
    const { data, error } = await this.client
      .from("admin_dashboard_projection")
      .select("*")
      .eq("organization_id", this.organizationId);
    if (error) return [];
    return (data ?? []) as Array<Record<string, unknown>>;
  }

  async getInvitations() {
    const { data, error } = await this.client
      .from("organization_invitations")
      .select("id,status,expires_at,created_at")
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapInvitation(row as Record<string, unknown>));
  }

  async getDomains() {
    const { data, error } = await this.client
      .from("organization_domains")
      .select("id,domain,verification_status,verified_at,expires_at")
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapDomain(row as Record<string, unknown>));
  }

  async getAnnouncements() {
    const { data, error } = await this.client
      .from("platform_announcements")
      .select("id,title,status,publish_at")
      .order("publish_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>));
  }
}
