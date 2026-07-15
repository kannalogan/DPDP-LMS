import type {
  CommunityWorkspace,
  DiscussionPost,
  LiveLearningSession
} from "@/features/community/types";
export const openReports = (workspace: CommunityWorkspace) =>
  workspace.reports.filter((item) => item.status === "open" || item.status === "reviewing");
export const upcomingSessions = (items: LiveLearningSession[], now = new Date()) =>
  items
    .filter((item) => item.status === "live" || new Date(item.endsAt) >= now)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
export const nestedReplies = (posts: DiscussionPost[], parentId: string | null) =>
  posts.filter((post) => post.parentPostId === parentId);
export const unreadConversationCount = (workspace: CommunityWorkspace) =>
  workspace.conversations.reduce((total, item) => total + item.unreadCount, 0);
