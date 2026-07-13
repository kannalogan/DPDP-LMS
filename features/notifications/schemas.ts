import { z } from "zod";

const uuid = z.string().uuid();
export const channelSchema = z.enum([
  "in_app",
  "email",
  "sms",
  "push",
  "teams",
  "slack",
  "webhook"
]);
export const prioritySchema = z.enum(["low", "normal", "high", "critical"]);
export const notificationIdSchema = z.object({ notificationId: uuid });
export const notificationSchema = z.object({
  organizationId: uuid,
  profileId: uuid,
  type: z.enum([
    "transactional",
    "learning",
    "assessment",
    "mentor",
    "compliance",
    "billing",
    "security",
    "career",
    "announcement"
  ]),
  purpose: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]*$/)
    .max(100),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1000),
  priority: prioritySchema.default("normal")
});
export const scheduleSchema = z.object({
  notificationId: uuid,
  scheduledFor: z.string().datetime(),
  recurrenceRule: z.string().trim().max(200).optional()
});
export const announcementSchema = z.object({
  organizationId: uuid,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  priority: prioritySchema.default("normal")
});
export const preferenceSchema = z.object({
  organizationId: uuid,
  categoryId: z.union([uuid, z.literal("")]).optional(),
  channel: channelSchema,
  enabled: z.coerce.boolean(),
  digestFrequency: z.enum(["immediate", "daily", "weekly", "never"]),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .or(z.literal("")),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .or(z.literal(""))
});
export const digestSchema = z
  .object({
    organizationId: uuid,
    profileId: uuid,
    frequency: z.enum(["daily", "weekly"]),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime()
  })
  .refine((value) => value.periodEnd > value.periodStart, {
    message: "Digest period must end after it starts."
  });
export const templateSchema = z.object({
  organizationId: uuid,
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]*$/)
    .max(100),
  name: z.string().trim().min(1).max(160),
  channel: channelSchema,
  locale: z.string().trim().min(2).max(20).default("en-IN"),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(20000)
});
export const templateVersionSchema = z.object({ templateVersionId: uuid });
export type NotificationInput = z.infer<typeof notificationSchema>;
