import type {
  ChatConversation,
  ChatMessage,
  CommunitySpace,
  DiscussionPost,
  DiscussionTopic,
  LiveLearningSession,
  ModerationReport,
  OfficeHour,
  StudyGroup
} from "@/features/community/types";

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const nullable = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const mapCommunitySpace = (row: Row): CommunitySpace => ({
  id: text(row.space_id ?? row.id),
  lastActivityAt: nullable(row.last_activity_at),
  memberCount: number(row.member_count),
  name: text(row.name),
  slug: text(row.slug),
  topicCount: number(row.topic_count),
  type: text(row.space_type, "organization"),
  visibility: text(row.visibility, "members")
});
export const mapDiscussionTopic = (row: Row): DiscussionTopic => ({
  authorId: text(row.author_profile_id),
  createdAt: text(row.created_at),
  id: text(row.id),
  isPinned: row.is_pinned === true,
  lastPostAt: nullable(row.last_post_at),
  postCount: number(row.post_count),
  solvedPostId: nullable(row.solved_post_id),
  spaceId: text(row.space_id),
  status: text(row.status, "open"),
  title: text(row.title)
});
export const mapDiscussionPost = (row: Row): DiscussionPost => ({
  authorId: text(row.author_profile_id),
  body: text(row.body),
  createdAt: text(row.created_at),
  id: text(row.id),
  isSolution: row.is_solution === true,
  parentPostId: nullable(row.parent_post_id),
  status: text(row.status),
  updatedAt: text(row.updated_at)
});
export const mapChatConversation = (row: Row): ChatConversation => ({
  archived: nullable(row.archived_at) !== null,
  id: text(row.id),
  lastMessageAt: nullable(row.last_message_at),
  name: text(row.name, text(row.channel_type, "Conversation")),
  type: text(row.channel_type),
  unreadCount: number(row.unread_count)
});
export const mapChatMessage = (row: Row): ChatMessage => ({
  body: text(row.body),
  editedAt: nullable(row.edited_at),
  id: text(row.id),
  isPinned: row.is_pinned === true,
  parentMessageId: nullable(row.parent_message_id),
  senderId: text(row.sender_profile_id),
  sentAt: text(row.sent_at),
  status: text(row.status)
});
export const mapLiveSession = (row: Row): LiveLearningSession => ({
  attendedCount: number(row.attended_count),
  endsAt: text(row.ends_at),
  id: text(row.session_id ?? row.id),
  participantCount: number(row.participant_count),
  provider: text(row.provider),
  recordingCount: number(row.recording_count),
  startsAt: text(row.starts_at),
  status: text(row.status),
  title: text(row.title)
});
export const mapOfficeHour = (row: Row): OfficeHour => ({
  capacity: number(row.capacity),
  endsAt: text(row.ends_at),
  id: text(row.id),
  mentorId: text(row.mentor_profile_id),
  provider: nullable(row.meeting_provider),
  startsAt: text(row.starts_at),
  status: text(row.status),
  title: text(row.title)
});
export const mapStudyGroup = (row: Row): StudyGroup => ({
  capacity: number(row.capacity),
  description: text(row.description),
  id: text(row.id),
  name: text(row.name),
  ownerId: text(row.owner_profile_id),
  status: text(row.status),
  visibility: text(row.visibility)
});
export const mapModerationReport = (row: Row): ModerationReport => ({
  createdAt: text(row.created_at),
  id: text(row.id),
  reason: text(row.reason),
  reporterId: text(row.reporter_profile_id),
  status: text(row.status),
  targetId: text(row.post_id ?? row.topic_id)
});
