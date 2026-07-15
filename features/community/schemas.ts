import { z } from "zod";
const uuid = z.string().uuid();
const body = z.string().trim().min(1).max(50_000);
export const discussionSchema = z.object({
  body,
  categoryId: z.union([uuid, z.literal("")]).optional(),
  spaceId: uuid,
  title: z.string().trim().min(3).max(240)
});
export const replySchema = z.object({
  body,
  parentPostId: z.union([uuid, z.literal("")]).optional(),
  topicId: uuid
});
export const reactionSchema = z.object({
  postId: uuid,
  reaction: z.enum(["like", "helpful", "celebrate", "insightful", "support"])
});
export const reportSchema = z.object({
  details: z.string().trim().max(4_000).optional(),
  postId: uuid,
  reason: z.enum(["spam", "harassment", "privacy", "unsafe", "off_topic", "other"])
});
export const messageSchema = z.object({
  body,
  channelId: uuid,
  parentMessageId: z.union([uuid, z.literal("")]).optional()
});
export const channelSchema = z.object({
  memberIds: z.array(uuid).min(1).max(100),
  name: z.string().trim().max(160).default(""),
  organizationId: uuid,
  type: z.enum(["direct", "group", "course", "mentor", "organization"])
});
export const liveSessionSchema = z
  .object({
    capacity: z.coerce.number().int().min(1).max(10_000),
    description: z.string().trim().max(10_000).default(""),
    endsAt: z.string().datetime(),
    organizationId: uuid,
    provider: z.enum(["zoom", "google_meet", "microsoft_teams", "bigbluebutton"]),
    startsAt: z.string().datetime(),
    title: z.string().trim().min(3).max(240)
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "End time must follow start time",
    path: ["endsAt"]
  });
export const officeHourSchema = z.object({
  agenda: z.string().trim().max(4_000).optional(),
  officeHourId: uuid
});
export const officeScheduleSchema = z
  .object({
    capacity: z.coerce.number().int().min(1).max(100),
    description: z.string().trim().max(10_000).default(""),
    endsAt: z.string().datetime(),
    organizationId: uuid,
    provider: z.union([
      z.enum(["zoom", "google_meet", "microsoft_teams", "bigbluebutton"]),
      z.literal("")
    ]),
    startsAt: z.string().datetime(),
    title: z.string().trim().min(3).max(240)
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "End time must follow start time",
    path: ["endsAt"]
  });
export const attendanceSchema = z.object({
  joinedAt: z.string().datetime(),
  leftAt: z.string().datetime().nullable().optional(),
  profileId: uuid,
  sessionId: uuid,
  status: z.enum(["present", "late", "partial", "absent", "excused"])
});
export const moderationSchema = z.object({
  reportId: uuid,
  resolution: z.string().trim().min(3).max(4_000),
  status: z.enum(["resolved", "dismissed"])
});
export const studyGroupSchema = z.object({
  capacity: z.coerce.number().int().min(2).max(500),
  description: z.string().trim().max(10_000).default(""),
  name: z.string().trim().min(3).max(160),
  organizationId: uuid,
  visibility: z.enum(["private", "invite_only", "organization"])
});
export const identifierSchema = z.object({ id: uuid });
export type DiscussionInput = z.infer<typeof discussionSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
