export type NotificationChannel =
  | "in_app"
  | "email"
  | "sms"
  | "push"
  | "teams"
  | "slack"
  | "webhook";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type InboxFolder = "inbox" | "archive" | "deleted";
export type DigestFrequency = "immediate" | "daily" | "weekly" | "never";

export type NotificationActionDto = { key: string; label: string; path: string | null };
export type NotificationInboxItem = {
  actions: NotificationActionDto[];
  createdAt: string;
  folder: InboxFolder;
  id: string;
  pinned: boolean;
  priority: NotificationPriority;
  purpose: string;
  readAt: string | null;
  summary: string;
  title: string;
  type: string;
};
export type NotificationPreference = {
  category: string | null;
  channel: NotificationChannel;
  digestFrequency: DigestFrequency;
  enabled: boolean;
  id: string;
  quietHoursEnd: string | null;
  quietHoursStart: string | null;
  timezone: string;
};
export type NotificationTemplate = {
  channel: NotificationChannel | null;
  id: string;
  key: string;
  latestVersionId: string | null;
  name: string;
  status: string;
  updatedAt: string;
  version: number | null;
};
export type NotificationSchedule = {
  id: string;
  notificationId: string;
  recurrenceRule: string | null;
  scheduledFor: string;
  status: string;
};
export type CommunicationAnnouncement = {
  body: string;
  expiresAt: string | null;
  id: string;
  priority: NotificationPriority;
  publishAt: string;
  title: string;
};
export type DeliveryMetric = { channel: string; count: number; date: string; status: string };
export type NotificationWorkspace = {
  announcements: CommunicationAnnouncement[];
  deliveries: DeliveryMetric[];
  inbox: NotificationInboxItem[];
  preferences: NotificationPreference[];
  schedules: NotificationSchedule[];
  templates: NotificationTemplate[];
};
export type NotificationRepository = {
  getAnnouncements(): Promise<CommunicationAnnouncement[]>;
  getDeliveries(): Promise<DeliveryMetric[]>;
  getInbox(folder?: InboxFolder): Promise<NotificationInboxItem[]>;
  getNotification(id: string): Promise<NotificationInboxItem | null>;
  getPreferences(): Promise<NotificationPreference[]>;
  getSchedules(): Promise<NotificationSchedule[]>;
  getTemplates(): Promise<NotificationTemplate[]>;
  getWorkspace(admin?: boolean): Promise<NotificationWorkspace>;
};
