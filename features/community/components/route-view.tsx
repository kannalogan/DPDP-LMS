import {
  CommunityAnalytics,
  CommunityDashboard,
  CommunityHeader,
  CommunityPermissionDenied,
  CommunitySubnav,
  CommunityUnavailable,
  DiscussionFeed,
  LiveSessionDashboard,
  LiveSessionRoom,
  LiveSessionScheduler,
  MessagingWorkspace,
  ModeratorQueue,
  OfficeHourCalendar,
  OfficeHourScheduler,
  RichEditor,
  StudyGroupCards,
  ThreadViewer
} from "@/features/community/components";
import {
  canAccessCommunity,
  getCommunityMessages,
  getCommunityOrganizationId,
  getCommunityTopic,
  getCommunityWorkspace
} from "@/features/community/server";
import type { CommunityAccess, CommunityRouteMode } from "@/features/community/types";

const copy: Record<CommunityRouteMode, { description: string; title: string }> = {
  home: {
    title: "Community home",
    description: "Join organization learning spaces, discussions, live sessions, and peer groups."
  },
  topics: {
    title: "Discussions",
    description: "Search, follow, and contribute to authorized learning conversations."
  },
  topic: {
    title: "Discussion thread",
    description:
      "Read nested replies, contribute in Markdown, and use accountable moderation tools."
  },
  messages: {
    title: "Messages",
    description: "Continue private and group conversations inside your organization boundary."
  },
  conversation: {
    title: "Conversation",
    description: "Read and reply in a member-only channel with protected read evidence."
  },
  live: {
    title: "Live learning",
    description: "Review scheduled classes, host state, attendance, recordings, polls, and Q&A."
  },
  "live-session": {
    title: "Live session",
    description: "Enter the authorized session workspace and review provider availability."
  },
  "study-groups": {
    title: "Study groups",
    description: "Create or join peer learning groups with shared session metadata."
  },
  "office-hours": {
    title: "Office hours",
    description: "Review mentor availability and manage organization-scoped bookings."
  },
  moderation: {
    title: "Community moderation",
    description: "Review reported content and preserve immutable moderation evidence."
  },
  reports: {
    title: "Communication analytics",
    description: "Inspect community activity, attendance, and moderation signals."
  }
};
export async function CommunityRouteView({
  access,
  entityId,
  mode
}: {
  access: CommunityAccess;
  entityId?: string;
  mode: CommunityRouteMode;
}) {
  if (!(await canAccessCommunity(access))) return <CommunityPermissionDenied />;
  const [data, organizationId] = await Promise.all([
    getCommunityWorkspace(access),
    getCommunityOrganizationId(access)
  ]);
  if (!data || !organizationId) return <CommunityPermissionDenied />;
  const detail = mode === "topic" && entityId ? await getCommunityTopic(access, entityId) : null;
  const messages =
    mode === "conversation" && entityId ? await getCommunityMessages(access, entityId) : [];
  const session =
    mode === "live-session" && entityId
      ? data.liveSessions.find((item) => item.id === entityId)
      : undefined;
  const content =
    mode === "home" ? (
      <CommunityDashboard access={access} data={data} />
    ) : mode === "topics" ? (
      <div className="community-workspace">
        <DiscussionFeed access={access} topics={data.topics} />
        {data.spaces[0] ? <RichEditor spaceId={data.spaces[0].id} /> : null}
      </div>
    ) : mode === "topic" ? (
      detail ? (
        <div className="community-workspace">
          <ThreadViewer posts={detail.posts} topic={detail.topic} />
        </div>
      ) : (
        <CommunityUnavailable />
      )
    ) : mode === "messages" || mode === "conversation" ? (
      <div className="community-workspace">
        <MessagingWorkspace
          access={access}
          conversationId={entityId}
          conversations={data.conversations}
          messages={messages}
        />
      </div>
    ) : mode === "live" ? (
      <div className="community-workspace">
        <LiveSessionDashboard sessions={data.liveSessions} />
        {access !== "student" ? <LiveSessionScheduler organizationId={organizationId} /> : null}
      </div>
    ) : mode === "live-session" ? (
      <div className="community-workspace">
        <LiveSessionRoom session={session} />
      </div>
    ) : mode === "study-groups" ? (
      <div className="community-workspace">
        <StudyGroupCards groups={data.studyGroups} organizationId={organizationId} />
      </div>
    ) : mode === "office-hours" ? (
      <div className="community-workspace">
        <OfficeHourCalendar officeHours={data.officeHours} />
        {access !== "student" ? <OfficeHourScheduler organizationId={organizationId} /> : null}
      </div>
    ) : mode === "moderation" ? (
      <div className="community-workspace">
        <ModeratorQueue reports={data.reports} />
      </div>
    ) : (
      <CommunityAnalytics data={data} />
    );
  return (
    <>
      <CommunityHeader access={access} {...copy[mode]} />
      <CommunitySubnav access={access} />
      {content}
    </>
  );
}
