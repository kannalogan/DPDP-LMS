import {
  Archive,
  Bell,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  Inbox as InboxIcon,
  Mail,
  Megaphone,
  Send,
  Settings2,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  archiveNotification,
  createAnnouncement,
  createNotificationTemplate,
  deleteNotification,
  dismissNotification,
  markNotificationRead,
  markNotificationUnread,
  publishNotificationTemplate,
  restoreNotification,
  scheduleNotificationFromForm,
  updateNotificationPreference
} from "@/features/notifications/actions";
import { buildDigestPreview } from "@/features/notifications/digest-manager";
import {
  formatNotificationDate,
  notificationPriorityTone,
  unreadNotifications
} from "@/features/notifications/selectors";
import type {
  CommunicationAnnouncement,
  DeliveryMetric,
  NotificationChannel,
  NotificationInboxItem,
  NotificationPreference,
  NotificationSchedule,
  NotificationTemplate,
  NotificationWorkspace
} from "@/features/notifications/types";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";
import { Checkbox, SearchInput, Select, Textarea } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";
import "@/features/notifications/notifications.css";

export function NotificationPageHeader({
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="notification-header">
      <div>
        <span className="student-eyebrow">Communication center</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={"/student/inbox" as Route}>
          <InboxIcon />
          Open inbox
        </Link>
      </Button>
    </header>
  );
}
export function NotificationCenter({ data }: { data: NotificationWorkspace }) {
  return (
    <div className="notification-workspace">
      <NotificationMetrics items={data.inbox} />
      <div className="notification-grid">
        <Inbox items={data.inbox} />
        <AnnouncementFeed announcements={data.announcements} />
        <DigestPreview items={data.inbox} />
        <NotificationPreferences preferences={data.preferences} />
      </div>
    </div>
  );
}
export function NotificationDrawer({ items }: { items: NotificationInboxItem[] }) {
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Notification drawer</h2>
        <Bell />
      </div>
      <MessageList items={items.slice(0, 5)} />
    </Card>
  );
}
export function Inbox({ items }: { items: NotificationInboxItem[] }) {
  return (
    <Card className="notification-panel notification-panel-wide">
      <div className="notification-panel-heading">
        <h2>Inbox</h2>
        <Badge tone="info">{unreadNotifications(items).length} unread</Badge>
      </div>
      <NotificationSearchFilters />
      <MessageList items={items} />
    </Card>
  );
}
export function MessageList({ items }: { items: NotificationInboxItem[] }) {
  if (!items.length) return <NotificationEmpty />;
  return (
    <div className="notification-list">
      {items.map((item) => (
        <MessageDetail item={item} key={item.id} />
      ))}
    </div>
  );
}
export function MessageDetail({ item }: { item: NotificationInboxItem }) {
  return (
    <article className="notification-message">
      <div className="notification-message-icon" aria-hidden="true">
        {item.readAt ? <Check /> : <Circle />}
      </div>
      <div className="notification-message-body">
        <div className="notification-panel-heading">
          <div>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
          </div>
          <PriorityBadge priority={item.priority} />
        </div>
        <small>{formatNotificationDate(item.createdAt)}</small>
        <div className="notification-actions">
          {item.readAt ? (
            <NotificationAction action={markNotificationUnread} id={item.id} label="Mark unread" />
          ) : (
            <NotificationAction action={markNotificationRead} id={item.id} label="Mark read" />
          )}
          <NotificationAction action={archiveNotification} id={item.id} label="Archive" />
          <NotificationAction action={dismissNotification} id={item.id} label="Dismiss" />
          <NotificationAction action={deleteNotification} id={item.id} label="Delete" />
          {item.actions.map((action) =>
            action.path ? (
              <Button asChild key={action.key} size="sm" variant="ghost">
                <Link href={action.path as Route}>{action.label}</Link>
              </Button>
            ) : null
          )}
        </div>
      </div>
    </article>
  );
}
type FormAction = (data: FormData) => void | Promise<void>;
function NotificationAction({
  action,
  id,
  label
}: {
  action(data: FormData): Promise<unknown>;
  id: string;
  label: string;
}) {
  return (
    <form action={action as FormAction}>
      <input name="notificationId" type="hidden" value={id} />
      <Button size="sm" type="submit" variant="ghost">
        {label}
      </Button>
    </form>
  );
}
export function AnnouncementFeed({
  announcements
}: {
  announcements: CommunicationAnnouncement[];
}) {
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Announcements</h2>
        <Megaphone />
      </div>
      {announcements.length ? (
        <div className="notification-list">
          {announcements.map((item) => (
            <article className="notification-announcement" key={item.id}>
              <PriorityBadge priority={item.priority} />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <small>{formatNotificationDate(item.publishAt)}</small>
            </article>
          ))}
        </div>
      ) : (
        <NotificationEmpty title="No announcements" />
      )}
    </Card>
  );
}
export function AnnouncementEditor({ organizationId }: { organizationId: string }) {
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Announcement editor</h2>
        <Megaphone />
      </div>
      <form action={createAnnouncement as unknown as FormAction} className="notification-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Title
          <Input maxLength={200} name="title" required />
        </label>
        <label>
          Message
          <Textarea maxLength={10000} name="body" required rows={6} />
        </label>
        <label>
          Priority
          <Select defaultValue="normal" name="priority">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </label>
        <Button type="submit">
          <Send />
          Publish announcement
        </Button>
      </form>
    </Card>
  );
}
export function TemplateBuilder({
  organizationId,
  templates
}: {
  organizationId?: string;
  templates: NotificationTemplate[];
}) {
  return (
    <Card className="notification-panel notification-panel-wide">
      <div className="notification-panel-heading">
        <h2>Template builder</h2>
        <Settings2 />
      </div>
      {organizationId ? (
        <form
          action={createNotificationTemplate as unknown as FormAction}
          className="notification-form"
        >
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Template name
            <Input maxLength={160} name="name" required />
          </label>
          <label>
            Template key
            <Input maxLength={100} name="key" pattern="[a-z][a-z0-9_.-]*" required />
          </label>
          <ChannelSelector />
          <label>
            Locale
            <Input defaultValue="en-IN" maxLength={20} name="locale" required />
          </label>
          <label>
            Subject
            <Input maxLength={200} name="subject" />
          </label>
          <label>
            Body
            <Textarea maxLength={20000} name="body" required rows={6} />
          </label>
          <Button type="submit">Create template</Button>
        </form>
      ) : null}
      <Table
        caption="Notification templates"
        columns={[
          { header: "Name", key: "name", render: (row) => row.name },
          { header: "Key", key: "key", render: (row) => <code>{row.key}</code> },
          {
            header: "Version",
            key: "version",
            render: (row) => (row.version ? `v${row.version} · ${row.channel}` : "No draft")
          },
          {
            header: "Status",
            key: "status",
            render: (row) => <Badge tone="info">{row.status}</Badge>
          },
          {
            header: "Updated",
            key: "updated",
            render: (row) => formatNotificationDate(row.updatedAt)
          },
          {
            header: "Publish",
            key: "publish",
            render: (row) =>
              row.latestVersionId && row.status !== "published" ? (
                <form action={publishNotificationTemplate as unknown as FormAction}>
                  <input name="templateVersionId" type="hidden" value={row.latestVersionId} />
                  <Button size="sm" type="submit" variant="secondary">
                    Publish
                  </Button>
                </form>
              ) : (
                <span>Published</span>
              )
          }
        ]}
        emptyMessage="No notification templates"
        rows={templates}
      />
    </Card>
  );
}
export function NotificationPreferences({
  preferences,
  organizationId
}: {
  preferences: NotificationPreference[];
  organizationId?: string;
}) {
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Preferences</h2>
        <Settings2 />
      </div>
      {organizationId ? (
        <form
          action={updateNotificationPreference as unknown as FormAction}
          className="notification-form"
        >
          <input name="organizationId" type="hidden" value={organizationId} />
          <ChannelSelector name="channel" />
          <label>
            Digest frequency
            <Select defaultValue="immediate" name="digestFrequency">
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </Select>
          </label>
          <label>
            Quiet hours start
            <Input name="quietHoursStart" type="time" />
          </label>
          <label>
            Quiet hours end
            <Input name="quietHoursEnd" type="time" />
          </label>
          <Checkbox defaultChecked label="Enable channel" name="enabled" value="true" />
          <Button type="submit">Save preferences</Button>
        </form>
      ) : null}
      <div className="notification-compact-list">
        {preferences.map((item) => (
          <div key={item.id}>
            <span>{item.channel.replace("_", " ")}</span>
            <Badge tone={item.enabled ? "success" : "neutral"}>
              {item.enabled ? item.digestFrequency : "disabled"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
export function ReminderManager({ schedules }: { schedules: NotificationSchedule[] }) {
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Reminder manager</h2>
        <CalendarClock />
      </div>
      <form
        action={scheduleNotificationFromForm as unknown as FormAction}
        className="notification-form"
      >
        <label>
          Notification ID
          <Input name="notificationId" required type="text" />
        </label>
        <label>
          Schedule time
          <Input name="scheduledFor" required type="datetime-local" />
        </label>
        <label>
          Recurrence rule
          <Input name="recurrenceRule" placeholder="Optional recurrence rule" />
        </label>
        <Button type="submit">
          <CalendarClock />
          Schedule
        </Button>
      </form>
      <ScheduleList schedules={schedules} />
    </Card>
  );
}
export function BroadcastManager({
  organizationId,
  announcements
}: {
  organizationId: string;
  announcements: CommunicationAnnouncement[];
}) {
  return (
    <div className="notification-grid">
      <AnnouncementEditor organizationId={organizationId} />
      <AnnouncementFeed announcements={announcements} />
    </div>
  );
}
export function ScheduleDialog({ schedules }: { schedules: NotificationSchedule[] }) {
  return <ReminderManager schedules={schedules} />;
}
export function ChannelSelector({ name = "channel" }: { name?: string }) {
  const channels: NotificationChannel[] = [
    "in_app",
    "email",
    "sms",
    "push",
    "teams",
    "slack",
    "webhook"
  ];
  return (
    <label>
      Channel
      <Select defaultValue="in_app" name={name}>
        {channels.map((channel) => (
          <option key={channel} value={channel}>
            {channel.replace("_", " ")}
          </option>
        ))}
      </Select>
    </label>
  );
}
export function PriorityBadge({ priority }: { priority: NotificationInboxItem["priority"] }) {
  return <Badge tone={notificationPriorityTone(priority)}>{priority}</Badge>;
}
export function ReadIndicator() {
  return (
    <span className="notification-indicator">
      <Check />
      Read
    </span>
  );
}
export function UnreadIndicator() {
  return (
    <span className="notification-indicator">
      <Circle />
      Unread
    </span>
  );
}
export function ArchiveView({ items }: { items: NotificationInboxItem[] }) {
  return (
    <Card className="notification-panel notification-panel-wide">
      <div className="notification-panel-heading">
        <h2>Archive</h2>
        <Archive />
      </div>
      {items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <article className="notification-message" key={item.id}>
              <div className="notification-message-body">
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                <NotificationAction action={restoreNotification} id={item.id} label="Restore" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <NotificationEmpty title="Archive is empty" />
      )}
    </Card>
  );
}
export function NotificationSearchFilters() {
  return (
    <div className="notification-filters">
      <SearchInput aria-label="Search notifications" placeholder="Search inbox" />
      <Select aria-label="Filter priority" defaultValue="all">
        <option value="all">All priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
      </Select>
    </div>
  );
}
export function NotificationPagination() {
  return (
    <nav aria-label="Notification pages" className="notification-pagination">
      <Button disabled size="sm" variant="ghost">
        Previous
      </Button>
      <span>Page 1</span>
      <Button disabled size="sm" variant="ghost">
        Next
      </Button>
    </nav>
  );
}
export function DigestPreview({ items }: { items: NotificationInboxItem[] }) {
  const digest = buildDigestPreview(items, 5);
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Digest preview</h2>
        <Mail />
      </div>
      {digest.length ? (
        <ul className="notification-digest">
          {digest.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      ) : (
        <NotificationEmpty title="Digest is clear" />
      )}
    </Card>
  );
}
export function DeliveryStatus({ deliveries }: { deliveries: DeliveryMetric[] }) {
  return (
    <Card className="notification-panel notification-panel-wide">
      <div className="notification-panel-heading">
        <h2>Delivery status</h2>
        <Send />
      </div>
      <Table
        caption="Delivery status"
        columns={[
          { header: "Date", key: "date", render: (row) => row.date },
          { header: "Channel", key: "channel", render: (row) => row.channel },
          {
            header: "Status",
            key: "status",
            render: (row) => (
              <Badge tone={row.status === "failed" ? "danger" : "success"}>{row.status}</Badge>
            )
          },
          { header: "Count", key: "count", render: (row) => row.count }
        ]}
        emptyMessage="No provider delivery attempts"
        rows={deliveries}
      />
    </Card>
  );
}
export function FailureViewer({ deliveries }: { deliveries: DeliveryMetric[] }) {
  const failures = deliveries.filter((item) => item.status === "failed");
  return (
    <Card className="notification-panel">
      <div className="notification-panel-heading">
        <h2>Failures</h2>
        <ShieldAlert />
      </div>
      {failures.length ? (
        <DeliveryStatus deliveries={failures} />
      ) : (
        <NotificationEmpty title="No delivery failures" />
      )}
    </Card>
  );
}
export function ScheduleList({ schedules }: { schedules: NotificationSchedule[] }) {
  return schedules.length ? (
    <div className="notification-compact-list">
      {schedules.map((item) => (
        <div key={item.id}>
          <span>
            <Clock3 />
            {formatNotificationDate(item.scheduledFor)}
          </span>
          <Badge tone="info">{item.status}</Badge>
        </div>
      ))}
    </div>
  ) : (
    <NotificationEmpty title="No scheduled notifications" />
  );
}
export function NotificationMetrics({ items }: { items: NotificationInboxItem[] }) {
  const values = [
    ["Inbox", items.length, <InboxIcon key="inbox" />],
    ["Unread", unreadNotifications(items).length, <Bell key="unread" />],
    [
      "Archived",
      items.filter((item) => item.folder === "archive").length,
      <Archive key="archive" />
    ]
  ] as const;
  return (
    <section className="notification-metrics">
      {values.map(([label, value, icon]) => (
        <Card className="notification-metric" key={label}>
          <div>
            {icon}
            <span>{label}</span>
          </div>
          <strong>{value}</strong>
        </Card>
      ))}
    </section>
  );
}
export function NotificationLoading() {
  return <LoadingState label="Loading secure communications" />;
}
export function NotificationEmpty({ title = "Inbox is clear" }: { title?: string }) {
  return (
    <EmptyState description="New workflow messages and reminders will appear here." title={title} />
  );
}
export function NotificationError() {
  return (
    <ErrorState
      description="The communication service could not be loaded."
      title="Notifications unavailable"
    />
  );
}
export function NotificationPermissionDenied() {
  return (
    <ErrorState
      description="Your active organization does not grant access to this communication workspace."
      title="Notification access required"
    />
  );
}
