import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Flag,
  Hash,
  Lock,
  MessageCircle,
  MessagesSquare,
  Pin,
  Radio,
  Search,
  ShieldCheck,
  Users,
  Video
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  bookOfficeHourAction,
  createDiscussionAction,
  createLiveSessionAction,
  createStudyGroupAction,
  joinStudyGroupAction,
  reactPostAction,
  replyDiscussionAction,
  reportPostAction,
  resolveReportAction,
  scheduleOfficeHoursAction,
  sendMessageAction
} from "@/features/community/actions";
import {
  nestedReplies,
  openReports,
  unreadConversationCount,
  upcomingSessions
} from "@/features/community/selectors";
import { providerLabel } from "@/features/community/workflow";
import type {
  ChatConversation,
  ChatMessage,
  CommunityAccess,
  CommunityWorkspace,
  DiscussionPost,
  DiscussionTopic,
  LiveLearningSession,
  ModerationReport,
  OfficeHour,
  StudyGroup
} from "@/features/community/types";
import { Button } from "@/shared/ui/button";
import { Card, MarkdownRenderer, MetricCard, Table, Timeline } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState, SkeletonState } from "@/shared/ui/feedback";
import { SearchInput, Select, Textarea } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";
import "@/features/community/community.css";

type FormAction = (data: FormData) => void | Promise<void>;
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "No activity";
export function CommunityHeader({
  access,
  description,
  title
}: {
  access: CommunityAccess;
  description: string;
  title: string;
}) {
  const destination =
    access === "admin"
      ? "/admin/moderation"
      : access === "mentor"
        ? "/mentor/live"
        : "/student/messages";
  return (
    <header className="community-header">
      <div>
        <span className="student-eyebrow">Community and live learning</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={destination as Route}>
          <MessagesSquare />
          Open workspace
        </Link>
      </Button>
    </header>
  );
}
export function CommunitySubnav({ access }: { access: CommunityAccess }) {
  const items =
    access === "admin"
      ? [
          ["Community", "/admin/community"],
          ["Moderation", "/admin/moderation"],
          ["Live", "/admin/live"],
          ["Reports", "/admin/reports/community"]
        ]
      : access === "mentor"
        ? [
            ["Community", "/mentor/community"],
            ["Messages", "/mentor/messages"],
            ["Live", "/mentor/live"],
            ["Office hours", "/mentor/office-hours"],
            ["Study groups", "/mentor/study-groups"]
          ]
        : [
            ["Home", "/student/community"],
            ["Topics", "/student/community/topics"],
            ["Messages", "/student/messages"],
            ["Live", "/student/live"],
            ["Groups", "/student/study-groups"],
            ["Office hours", "/student/office-hours"]
          ];
  return (
    <nav aria-label="Community views" className="community-subnav">
      {items.map(([label, href]) => (
        <Link href={href as Route} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function CommunityDashboard({
  access,
  data
}: {
  access: CommunityAccess;
  data: CommunityWorkspace;
}) {
  return (
    <div className="community-workspace">
      <div className="community-metrics">
        <MetricCard label="Spaces" value={String(data.spaces.length)} />
        <MetricCard
          label="Open topics"
          value={String(data.topics.filter((topic) => topic.status === "open").length)}
        />
        <MetricCard label="Unread messages" value={String(unreadConversationCount(data))} />
        <MetricCard
          label="Upcoming live sessions"
          value={String(upcomingSessions(data.liveSessions).length)}
        />
      </div>
      <div className="community-grid">
        <DiscussionFeed access={access} topics={data.topics.slice(0, 8)} />
        <LiveSessionDashboard sessions={data.liveSessions.slice(0, 6)} />
        <StudyGroupCards groups={data.studyGroups.slice(0, 6)} />
        <OfficeHourCalendar officeHours={data.officeHours.slice(0, 6)} />
      </div>
    </div>
  );
}
export function CommunitySearchFilters() {
  return (
    <div className="community-filters">
      <SearchInput
        aria-label="Search community"
        placeholder="Search discussions, people, or groups"
      />
      <Select aria-label="Content type" defaultValue="all">
        <option value="all">All content</option>
        <option value="discussion">Discussions</option>
        <option value="live">Live sessions</option>
        <option value="groups">Study groups</option>
      </Select>
      <Button variant="secondary">
        <Search />
        Search
      </Button>
    </div>
  );
}
export function DiscussionFeed({
  access = "student",
  topics
}: {
  access?: CommunityAccess;
  topics: DiscussionTopic[];
}) {
  return (
    <Card className="community-panel community-panel-wide">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Discussion feed</span>
          <h2>Latest conversations</h2>
        </div>
        <MessageCircle />
      </div>
      <CommunitySearchFilters />
      {topics.length ? (
        <div className="community-list">
          {topics.map((topic) => (
            <article className="topic-row" key={topic.id}>
              <div className="topic-symbol">
                {topic.isPinned ? <Pin /> : topic.status === "locked" ? <Lock /> : <Hash />}
              </div>
              <div>
                {access === "student" ? (
                  <Link href={`/student/community/topic/${topic.id}` as Route}>
                    <strong>{topic.title}</strong>
                  </Link>
                ) : (
                  <strong>{topic.title}</strong>
                )}
                <p>
                  {topic.postCount} posts · {date(topic.lastPostAt ?? topic.createdAt)}
                </p>
              </div>
              <Badge
                tone={
                  topic.solvedPostId ? "success" : topic.status === "locked" ? "warning" : "neutral"
                }
              >
                {topic.solvedPostId ? "Solved" : topic.status}
              </Badge>
            </article>
          ))}
        </div>
      ) : (
        <CommunityEmpty title="No discussions yet" />
      )}
    </Card>
  );
}
export function RichEditor({ spaceId, topicId }: { spaceId?: string; topicId?: string }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Markdown editor</span>
          <h2>{topicId ? "Reply" : "Start a discussion"}</h2>
        </div>
        <Hash />
      </div>
      <form
        action={(topicId ? replyDiscussionAction : createDiscussionAction) as unknown as FormAction}
        className="community-form"
      >
        {topicId ? (
          <input name="topicId" type="hidden" value={topicId} />
        ) : (
          <>
            <input name="spaceId" type="hidden" value={spaceId} />
            <label>
              Topic title
              <Input maxLength={240} name="title" required />
            </label>
          </>
        )}
        <label>
          Message
          <Textarea
            maxLength={50000}
            name="body"
            placeholder="Use Markdown for headings, lists, links, and code blocks."
            required
            rows={8}
          />
        </label>
        <div className="editor-toolbar" aria-label="Editor capabilities">
          <Badge>Markdown</Badge>
          <Badge>Code blocks</Badge>
          <Badge>Mentions</Badge>
          <Badge>Hashtags</Badge>
          <Badge>Attachments</Badge>
        </div>
        <Button type="submit">{topicId ? "Post reply" : "Create discussion"}</Button>
      </form>
    </Card>
  );
}
export function ThreadViewer({
  posts,
  topic
}: {
  posts: DiscussionPost[];
  topic: DiscussionTopic;
}) {
  const roots = nestedReplies(posts, null);
  return (
    <div className="community-thread">
      <Card className="community-panel">
        <div className="community-panel-heading">
          <div>
            <span className="community-kicker">{topic.status}</span>
            <h2>{topic.title}</h2>
          </div>
          {topic.isPinned ? <Pin /> : <MessageCircle />}
        </div>
        {roots.length ? (
          roots.map((post) => (
            <PostItem key={post.id} post={post} replies={nestedReplies(posts, post.id)} />
          ))
        ) : (
          <CommunityEmpty title="No visible posts" />
        )}
      </Card>
      <RichEditor topicId={topic.id} />
    </div>
  );
}
function PostItem({ post, replies }: { post: DiscussionPost; replies: DiscussionPost[] }) {
  return (
    <article className={`discussion-post ${post.isSolution ? "is-solution" : ""}`}>
      <header>
        <div>
          <strong>Community member</strong>
          <time>{date(post.createdAt)}</time>
        </div>
        {post.isSolution ? (
          <Badge tone="success">
            <CheckCircle2 />
            Solved answer
          </Badge>
        ) : null}
      </header>
      <MarkdownRenderer
        content={post.status === "deleted" ? "This post was deleted." : post.body}
      />
      {post.status !== "deleted" ? (
        <div className="community-actions">
          <form action={reactPostAction as unknown as FormAction}>
            <input name="postId" type="hidden" value={post.id} />
            <input name="reaction" type="hidden" value="helpful" />
            <Button size="sm" type="submit" variant="ghost">
              Helpful
            </Button>
          </form>
          <form action={reportPostAction as unknown as FormAction}>
            <input name="postId" type="hidden" value={post.id} />
            <input name="reason" type="hidden" value="other" />
            <Button size="sm" type="submit" variant="ghost">
              <Flag />
              Report
            </Button>
          </form>
        </div>
      ) : null}
      {replies.length ? (
        <div className="nested-replies">
          {replies.map((reply) => (
            <PostItem key={reply.id} post={reply} replies={[]} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
export function ConversationSidebar({
  access,
  conversations
}: {
  access: CommunityAccess;
  conversations: ChatConversation[];
}) {
  return (
    <Card className="conversation-sidebar">
      <div className="community-panel-heading">
        <h2>Conversations</h2>
        <MessagesSquare />
      </div>
      {conversations.length ? (
        <nav aria-label="Conversations">
          {conversations.map((item) => {
            const content = (
              <>
                <span>
                  <strong>{item.name}</strong>
                  <small>{date(item.lastMessageAt)}</small>
                </span>
                {item.unreadCount ? <Badge tone="info">{item.unreadCount}</Badge> : null}
              </>
            );
            return access === "student" ? (
              <Link href={`/student/messages/${item.id}` as Route} key={item.id}>
                {content}
              </Link>
            ) : (
              <div className="conversation-row" key={item.id}>
                {content}
              </div>
            );
          })}
        </nav>
      ) : (
        <CommunityEmpty title="No conversations" />
      )}
    </Card>
  );
}
export function MessagePanel({
  conversationId,
  messages
}: {
  conversationId: string | undefined;
  messages: ChatMessage[];
}) {
  if (!conversationId)
    return (
      <Card className="message-panel">
        <CommunityEmpty title="Select a conversation" />
      </Card>
    );
  return (
    <Card className="message-panel">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Private channel</span>
          <h2>Messages</h2>
        </div>
        <ShieldCheck />
      </div>
      <div aria-live="polite" className="message-stream">
        {messages.length ? (
          messages.map((message) => (
            <article className="chat-message" key={message.id}>
              <header>
                <strong>Member</strong>
                <time>{date(message.sentAt)}</time>
              </header>
              <MarkdownRenderer
                content={message.status === "deleted" ? "Message removed." : message.body}
              />
              {message.editedAt ? <small>Edited</small> : null}
            </article>
          ))
        ) : (
          <CommunityEmpty title="No messages yet" />
        )}
      </div>
      <form action={sendMessageAction as unknown as FormAction} className="message-composer">
        <input name="channelId" type="hidden" value={conversationId} />
        <Textarea
          aria-label="Message"
          maxLength={50000}
          name="body"
          placeholder="Write a message"
          required
          rows={3}
        />
        <div className="community-actions">
          <span className="typing-indicator" role="status">
            Read receipts and typing state are channel-scoped.
          </span>
          <Button type="submit">Send message</Button>
        </div>
      </form>
    </Card>
  );
}
export function MessagingWorkspace({
  access,
  conversationId,
  conversations,
  messages
}: {
  access: CommunityAccess;
  conversationId: string | undefined;
  conversations: ChatConversation[];
  messages: ChatMessage[];
}) {
  return (
    <div className="messaging-layout">
      <ConversationSidebar access={access} conversations={conversations} />
      <MessagePanel conversationId={conversationId} messages={messages} />
    </div>
  );
}
export function LiveSessionDashboard({ sessions }: { sessions: LiveLearningSession[] }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Live learning</span>
          <h2>Sessions</h2>
        </div>
        <Radio />
      </div>
      {sessions.length ? (
        <div className="community-list">
          {sessions.map((session) => (
            <article className="live-row" key={session.id}>
              <div>
                <Badge tone={session.status === "live" ? "danger" : "info"}>{session.status}</Badge>
                <h3>{session.title}</h3>
                <p>
                  {providerLabel(session.provider)} · {date(session.startsAt)}
                </p>
              </div>
              <div className="live-metrics">
                <span>
                  <Users />
                  {session.participantCount}
                </span>
                <span>
                  <Video />
                  {session.recordingCount}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CommunityEmpty title="No live sessions scheduled" />
      )}
    </Card>
  );
}
export function LiveSessionScheduler({ organizationId }: { organizationId: string }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <h2>Schedule live session</h2>
        <Video />
      </div>
      <form action={createLiveSessionAction as unknown as FormAction} className="community-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Title
          <Input name="title" required />
        </label>
        <label>
          Description
          <Textarea name="description" rows={3} />
        </label>
        <label>
          Provider
          <Select defaultValue="microsoft_teams" name="provider">
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="microsoft_teams">Microsoft Teams</option>
            <option value="bigbluebutton">BigBlueButton</option>
          </Select>
        </label>
        <div className="form-columns">
          <label>
            Starts
            <Input name="startsAt" required type="datetime-local" />
          </label>
          <label>
            Ends
            <Input name="endsAt" required type="datetime-local" />
          </label>
        </div>
        <label>
          Capacity
          <Input defaultValue="100" min="1" name="capacity" type="number" />
        </label>
        <Button type="submit">Schedule session</Button>
      </form>
    </Card>
  );
}
export function LiveSessionRoom({ session }: { session: LiveLearningSession | undefined }) {
  if (!session) return <CommunityEmpty title="Session unavailable" />;
  return (
    <div className="community-grid">
      <Card className="community-panel community-panel-wide">
        <div className="live-stage">
          <Video />
          <Badge tone={session.status === "live" ? "danger" : "info"}>{session.status}</Badge>
          <h2>{session.title}</h2>
          <p>
            {providerLabel(session.provider)} meeting metadata is ready. Vendor SDK connections
            remain disabled.
          </p>
          <Button disabled={session.status !== "live"}>Join live session</Button>
        </div>
      </Card>
      <PollWidget />
      <QaWidget />
      <AttendancePanel session={session} />
    </div>
  );
}
export function PollWidget() {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <h2>Polls</h2>
        <BarChart3 />
      </div>
      <EmptyState description="The host has not opened a poll." title="No active poll" />
    </Card>
  );
}
export function QaWidget() {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <h2>Q&A</h2>
        <MessageCircle />
      </div>
      <form className="community-form">
        <label>
          Ask the host
          <Textarea disabled placeholder="Available while a session is live" rows={3} />
        </label>
        <Button disabled>Submit question</Button>
      </form>
    </Card>
  );
}
export function AttendancePanel({ session }: { session: LiveLearningSession }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <h2>Attendance</h2>
        <Users />
      </div>
      <div className="attendance-summary">
        <strong>{session.attendedCount}</strong>
        <span>recorded attendees</span>
        <progress
          aria-label="Attendance"
          max={Math.max(1, session.participantCount)}
          value={session.attendedCount}
        />
      </div>
    </Card>
  );
}
export function StudyGroupCards({
  groups,
  organizationId
}: {
  groups: StudyGroup[];
  organizationId?: string;
}) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Peer learning</span>
          <h2>Study groups</h2>
        </div>
        <Users />
      </div>
      {organizationId ? (
        <form action={createStudyGroupAction as unknown as FormAction} className="community-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Group name
            <Input name="name" required />
          </label>
          <label>
            Description
            <Textarea name="description" rows={3} />
          </label>
          <div className="form-columns">
            <Select defaultValue="organization" name="visibility">
              <option value="organization">Organization</option>
              <option value="invite_only">Invite only</option>
              <option value="private">Private</option>
            </Select>
            <Input defaultValue="20" min="2" name="capacity" type="number" />
          </div>
          <Button type="submit">Create group</Button>
        </form>
      ) : null}
      {groups.length ? (
        <div className="community-list">
          {groups.map((group) => (
            <article className="group-card" key={group.id}>
              <div>
                <Badge>{group.visibility}</Badge>
                <h3>{group.name}</h3>
                <p>{group.description || "No description provided."}</p>
                <small>Capacity {group.capacity}</small>
              </div>
              <form action={joinStudyGroupAction as unknown as FormAction}>
                <input name="id" type="hidden" value={group.id} />
                <Button size="sm" type="submit" variant="secondary">
                  Join group
                </Button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <CommunityEmpty title="No study groups" />
      )}
    </Card>
  );
}
export function OfficeHourCalendar({ officeHours }: { officeHours: OfficeHour[] }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Mentor availability</span>
          <h2>Office hours</h2>
        </div>
        <CalendarClock />
      </div>
      {officeHours.length ? (
        <Timeline
          items={officeHours.map((item) => ({
            content: (
              <div className="office-row">
                <span>{item.provider ? providerLabel(item.provider) : "Provider pending"}</span>
                <form action={bookOfficeHourAction as unknown as FormAction}>
                  <input name="officeHourId" type="hidden" value={item.id} />
                  <Button size="sm" type="submit" variant="secondary">
                    Book
                  </Button>
                </form>
              </div>
            ),
            time: date(item.startsAt),
            title: item.title
          }))}
        />
      ) : (
        <CommunityEmpty title="No office hours available" />
      )}
    </Card>
  );
}
export function OfficeHourScheduler({ organizationId }: { organizationId: string }) {
  return (
    <Card className="community-panel">
      <div className="community-panel-heading">
        <h2>Publish availability</h2>
        <CalendarClock />
      </div>
      <form action={scheduleOfficeHoursAction as unknown as FormAction} className="community-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Title
          <Input name="title" required />
        </label>
        <label>
          Description
          <Textarea name="description" rows={3} />
        </label>
        <div className="form-columns">
          <label>
            Starts
            <Input name="startsAt" required type="datetime-local" />
          </label>
          <label>
            Ends
            <Input name="endsAt" required type="datetime-local" />
          </label>
        </div>
        <div className="form-columns">
          <Select defaultValue="" name="provider">
            <option value="">Provider pending</option>
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="microsoft_teams">Microsoft Teams</option>
            <option value="bigbluebutton">BigBlueButton</option>
          </Select>
          <Input defaultValue="1" min="1" name="capacity" type="number" />
        </div>
        <Button type="submit">Publish office hours</Button>
      </form>
    </Card>
  );
}
export function ModeratorQueue({ reports }: { reports: ModerationReport[] }) {
  return (
    <Card className="community-panel community-panel-wide">
      <div className="community-panel-heading">
        <div>
          <span className="community-kicker">Moderation</span>
          <h2>Reported content</h2>
        </div>
        <ShieldCheck />
      </div>
      <Table
        caption="Community moderation queue"
        columns={[
          { key: "reason", header: "Reason", render: (row: ModerationReport) => row.reason },
          {
            key: "status",
            header: "Status",
            render: (row) => <Badge tone="warning">{row.status}</Badge>
          },
          { key: "created", header: "Reported", render: (row) => date(row.createdAt) },
          {
            key: "action",
            header: "Decision",
            render: (row) => (
              <form
                action={resolveReportAction as unknown as FormAction}
                className="moderation-action"
              >
                <input name="reportId" type="hidden" value={row.id} />
                <input name="resolution" type="hidden" value="Reviewed by authorized moderator" />
                <input name="status" type="hidden" value="resolved" />
                <Button size="sm" type="submit" variant="secondary">
                  Resolve
                </Button>
              </form>
            )
          }
        ]}
        emptyMessage="No reports require review."
        rows={reports}
      />
    </Card>
  );
}
export function CommunityAnalytics({ data }: { data: CommunityWorkspace }) {
  const reports = openReports(data);
  return (
    <div className="community-workspace">
      <div className="community-metrics">
        <MetricCard label="Community spaces" value={String(data.spaces.length)} />
        <MetricCard
          label="Discussion activity"
          value={String(data.topics.reduce((sum, topic) => sum + topic.postCount, 0))}
        />
        <MetricCard
          label="Live attendance"
          value={String(data.liveSessions.reduce((sum, session) => sum + session.attendedCount, 0))}
        />
        <MetricCard label="Open moderation" value={String(reports.length)} />
      </div>
      <ModeratorQueue reports={reports} />
    </div>
  );
}
export const CommunityLoading = () => (
  <div className="community-workspace">
    <LoadingState label="Loading community workspace" />
    <SkeletonState rows={5} />
  </div>
);
export const CommunityEmpty = ({ title = "Nothing here yet" }: { title?: string }) => (
  <EmptyState
    description="This workspace will update when authorized activity is available."
    title={title}
  />
);
export const CommunityError = () => (
  <ErrorState description="The community workspace could not be loaded safely." />
);
export const CommunityPermissionDenied = () => (
  <div className="community-workspace">
    <ErrorState
      description="Your current organization role does not permit access to this communication workspace."
      title="Permission required"
    />
  </div>
);
export const CommunityUnavailable = () => (
  <div className="community-workspace">
    <EmptyState
      description="This content is unavailable, archived, or outside your organization."
      title="Content unavailable"
    />
  </div>
);
