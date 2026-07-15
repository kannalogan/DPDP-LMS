import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapChatConversation,
  mapChatMessage,
  mapCommunitySpace,
  mapDiscussionPost,
  mapDiscussionTopic,
  mapLiveSession,
  mapModerationReport,
  mapOfficeHour,
  mapStudyGroup
} from "@/features/community/mappers";
import type { CommunityRepository } from "@/features/community/types";

type Row = Record<string, unknown>;
export class SupabaseCommunityRepository implements CommunityRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly profileId: string
  ) {}
  async getSpaces() {
    const { data, error } = await this.client
      .from("community_dashboard_projection")
      .select(
        "space_id,organization_id,name,slug,space_type,visibility,status,member_count,topic_count,last_activity_at"
      )
      .eq("organization_id", this.organizationId)
      .order("last_activity_at", { ascending: false });
    return error ? [] : (data ?? []).map((row) => mapCommunitySpace(row as Row));
  }
  async getTopics() {
    const { data, error } = await this.client
      .from("discussion_topics")
      .select(
        "id,space_id,author_profile_id,title,status,is_pinned,solved_post_id,post_count,last_post_at,created_at"
      )
      .eq("organization_id", this.organizationId)
      .in("status", ["open", "locked"])
      .order("is_pinned", { ascending: false })
      .order("last_post_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapDiscussionTopic(row as Row));
  }
  async getTopic(topicId: string) {
    const [topicResult, postsResult] = await Promise.all([
      this.client
        .from("discussion_topics")
        .select(
          "id,space_id,author_profile_id,title,status,is_pinned,solved_post_id,post_count,last_post_at,created_at"
        )
        .eq("organization_id", this.organizationId)
        .eq("id", topicId)
        .maybeSingle(),
      this.client
        .from("discussion_posts")
        .select(
          "id,topic_id,parent_post_id,author_profile_id,body,status,is_solution,created_at,updated_at"
        )
        .eq("organization_id", this.organizationId)
        .eq("topic_id", topicId)
        .order("created_at")
    ]);
    if (topicResult.error || !topicResult.data) return null;
    return {
      posts: postsResult.error
        ? []
        : (postsResult.data ?? []).map((row) => mapDiscussionPost(row as Row)),
      topic: mapDiscussionTopic(topicResult.data as Row)
    };
  }
  async getConversations() {
    const { data, error } = await this.client
      .from("chat_members")
      .select(
        "archived_at,last_read_at,chat_channels!inner(id,name,channel_type,status,last_message_at)"
      )
      .eq("organization_id", this.organizationId)
      .eq("profile_id", this.profileId)
      .eq("status", "active")
      .order("joined_at", { ascending: false });
    if (error) return [];
    return Promise.all(
      (data ?? []).map(async (membership) => {
        const channelValue = (membership as Row).chat_channels;
        const channel = (Array.isArray(channelValue) ? channelValue[0] : channelValue) as
          | Row
          | undefined;
        if (!channel) return mapChatConversation({});
        let unreadCount = 0;
        const lastRead =
          typeof (membership as Row).last_read_at === "string"
            ? String((membership as Row).last_read_at)
            : null;
        let query = this.client
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", String(channel.id))
          .neq("sender_profile_id", this.profileId)
          .in("status", ["sent", "edited"]);
        if (lastRead) query = query.gt("sent_at", lastRead);
        const countResult = await query;
        if (!countResult.error) unreadCount = countResult.count ?? 0;
        return mapChatConversation({
          ...channel,
          archived_at: (membership as Row).archived_at,
          unread_count: unreadCount
        });
      })
    );
  }
  async getMessages(channelId: string) {
    const { data, error } = await this.client
      .from("chat_messages")
      .select(
        "id,channel_id,sender_profile_id,parent_message_id,body,status,is_pinned,sent_at,edited_at"
      )
      .eq("organization_id", this.organizationId)
      .eq("channel_id", channelId)
      .order("sent_at")
      .limit(200);
    return error ? [] : (data ?? []).map((row) => mapChatMessage(row as Row));
  }
  async getLiveSessions() {
    const { data, error } = await this.client
      .from("live_learning_projection")
      .select(
        "session_id,organization_id,title,provider,status,starts_at,ends_at,participant_count,attended_count,recording_count"
      )
      .eq("organization_id", this.organizationId)
      .order("starts_at")
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapLiveSession(row as Row));
  }
  async getOfficeHours() {
    const { data, error } = await this.client
      .from("office_hours")
      .select("id,mentor_profile_id,title,starts_at,ends_at,capacity,meeting_provider,status")
      .eq("organization_id", this.organizationId)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapOfficeHour(row as Row));
  }
  async getStudyGroups() {
    const { data, error } = await this.client
      .from("study_groups")
      .select("id,owner_profile_id,name,description,visibility,status,capacity")
      .eq("organization_id", this.organizationId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapStudyGroup(row as Row));
  }
  async getReports() {
    const { data, error } = await this.client
      .from("discussion_reports")
      .select("id,post_id,topic_id,reporter_profile_id,reason,status,created_at")
      .eq("organization_id", this.organizationId)
      .in("status", ["open", "reviewing"])
      .order("created_at")
      .limit(100);
    return error ? [] : (data ?? []).map((row) => mapModerationReport(row as Row));
  }
  async getWorkspace(admin = false) {
    const [spaces, topics, conversations, liveSessions, officeHours, studyGroups, reports] =
      await Promise.all([
        this.getSpaces(),
        this.getTopics(),
        this.getConversations(),
        this.getLiveSessions(),
        this.getOfficeHours(),
        this.getStudyGroups(),
        admin ? this.getReports() : Promise.resolve([])
      ]);
    return { conversations, liveSessions, officeHours, reports, spaces, studyGroups, topics };
  }
}
