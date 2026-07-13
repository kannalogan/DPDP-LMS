import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAnnouncement,
  mapDelivery,
  mapNotification,
  mapPreference,
  mapSchedule,
  mapTemplate
} from "@/features/notifications/mappers";
import type { InboxFolder, NotificationRepository } from "@/features/notifications/types";

export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}
  async getInbox(folder: InboxFolder = "inbox") {
    const { data, error } = await this.client
      .from("notification_inbox_projection")
      .select(
        "notification_id,organization_id,profile_id,type,purpose,priority,title,summary,status,read_at,created_at,folder,pinned,actions"
      )
      .eq("profile_id", this.profileId)
      .eq("folder", folder)
      .order("created_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapNotification(row as Record<string, unknown>));
  }
  async getNotification(id: string) {
    const { data, error } = await this.client
      .from("notification_inbox_projection")
      .select(
        "notification_id,type,purpose,priority,title,summary,read_at,created_at,folder,pinned,actions"
      )
      .eq("profile_id", this.profileId)
      .eq("notification_id", id)
      .maybeSingle();
    return error || !data ? null : mapNotification(data as Record<string, unknown>);
  }
  async getPreferences() {
    const { data, error } = await this.client
      .from("notification_preference_projection")
      .select(
        "id,category,channel,enabled,quiet_hours_start,quiet_hours_end,timezone,digest_frequency"
      )
      .eq("profile_id", this.profileId)
      .eq("organization_id", this.organizationId)
      .order("channel");
    return error ? [] : (data ?? []).map((row) => mapPreference(row as Record<string, unknown>));
  }
  async getAnnouncements() {
    const { data, error } = await this.client
      .from("announcement_feed_projection")
      .select("message_id,organization_id,title,body,priority,publish_at,expires_at")
      .eq("organization_id", this.organizationId)
      .order("publish_at", { ascending: false })
      .limit(50);
    return error ? [] : (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>));
  }
  async getTemplates() {
    const { data, error } = await this.client
      .from("notification_templates")
      .select(
        "id,key,name,status,updated_at,notification_template_versions(id,version,channel,status,created_at)"
      )
      .or(`organization_id.eq.${this.organizationId},organization_id.is.null`)
      .order("updated_at", { ascending: false });
    return error ? [] : (data ?? []).map((row) => mapTemplate(row as Record<string, unknown>));
  }
  async getSchedules() {
    const { data, error } = await this.client
      .from("scheduled_notifications")
      .select("id,notification_id,scheduled_for,recurrence_rule,status")
      .eq("organization_id", this.organizationId)
      .order("scheduled_for", { ascending: true })
      .limit(50);
    return error ? [] : (data ?? []).map((row) => mapSchedule(row as Record<string, unknown>));
  }
  async getDeliveries() {
    const { data, error } = await this.client
      .from("notification_delivery_reporting")
      .select("organization_id,activity_date,channel,status,delivery_count")
      .eq("organization_id", this.organizationId)
      .order("activity_date", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapDelivery(row as Record<string, unknown>));
  }
  async getWorkspace(admin = false) {
    const [inbox, preferences, announcements, templates, schedules, deliveries] = await Promise.all(
      [
        this.getInbox(),
        this.getPreferences(),
        this.getAnnouncements(),
        admin ? this.getTemplates() : Promise.resolve([]),
        admin ? this.getSchedules() : Promise.resolve([]),
        admin ? this.getDeliveries() : Promise.resolve([])
      ]
    );
    return { inbox, preferences, announcements, templates, schedules, deliveries };
  }
}
