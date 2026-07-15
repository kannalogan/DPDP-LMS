export type CommunityAccess = "student" | "mentor" | "admin";
export type CommunityRouteMode =
  | "home"
  | "topics"
  | "topic"
  | "messages"
  | "conversation"
  | "live"
  | "live-session"
  | "study-groups"
  | "office-hours"
  | "moderation"
  | "reports";

export type CommunitySpace = {
  id: string;
  lastActivityAt: string | null;
  memberCount: number;
  name: string;
  slug: string;
  topicCount: number;
  type: string;
  visibility: string;
};
export type DiscussionTopic = {
  authorId: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  lastPostAt: string | null;
  postCount: number;
  solvedPostId: string | null;
  spaceId: string;
  status: string;
  title: string;
};
export type DiscussionPost = {
  authorId: string;
  body: string;
  createdAt: string;
  id: string;
  isSolution: boolean;
  parentPostId: string | null;
  status: string;
  updatedAt: string;
};
export type ChatConversation = {
  archived: boolean;
  id: string;
  lastMessageAt: string | null;
  name: string;
  type: string;
  unreadCount: number;
};
export type ChatMessage = {
  body: string;
  editedAt: string | null;
  id: string;
  isPinned: boolean;
  parentMessageId: string | null;
  senderId: string;
  sentAt: string;
  status: string;
};
export type LiveLearningSession = {
  attendedCount: number;
  endsAt: string;
  id: string;
  participantCount: number;
  provider: string;
  recordingCount: number;
  startsAt: string;
  status: string;
  title: string;
};
export type OfficeHour = {
  capacity: number;
  endsAt: string;
  id: string;
  mentorId: string;
  provider: string | null;
  startsAt: string;
  status: string;
  title: string;
};
export type StudyGroup = {
  capacity: number;
  description: string;
  id: string;
  name: string;
  ownerId: string;
  status: string;
  visibility: string;
};
export type ModerationReport = {
  createdAt: string;
  id: string;
  reason: string;
  reporterId: string;
  status: string;
  targetId: string;
};
export type CommunityWorkspace = {
  conversations: ChatConversation[];
  liveSessions: LiveLearningSession[];
  officeHours: OfficeHour[];
  reports: ModerationReport[];
  spaces: CommunitySpace[];
  studyGroups: StudyGroup[];
  topics: DiscussionTopic[];
};
export type CommunityRepository = {
  getConversations(): Promise<ChatConversation[]>;
  getLiveSessions(): Promise<LiveLearningSession[]>;
  getMessages(channelId: string): Promise<ChatMessage[]>;
  getOfficeHours(): Promise<OfficeHour[]>;
  getReports(): Promise<ModerationReport[]>;
  getSpaces(): Promise<CommunitySpace[]>;
  getStudyGroups(): Promise<StudyGroup[]>;
  getTopic(topicId: string): Promise<{ posts: DiscussionPost[]; topic: DiscussionTopic } | null>;
  getTopics(): Promise<DiscussionTopic[]>;
  getWorkspace(admin?: boolean): Promise<CommunityWorkspace>;
};
