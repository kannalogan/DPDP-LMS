import { z } from "zod";
const uuid = z.string().uuid();
export const searchSortSchema = z.enum(["relevance", "recent", "popular", "title"]);
export const searchFiltersSchema = z.object({
  entityTypes: z.array(z.string().min(1).max(50)).max(12).optional(),
  categoryId: uuid.optional(),
  tags: z.array(z.string().min(1).max(80)).max(12).optional(),
  status: z.string().max(50).optional(),
  authorId: uuid.optional(),
  courseId: uuid.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional()
});
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  sort: searchSortSchema.default("relevance"),
  type: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).max(20).default(1)
});
export const saveSearchSchema = z.object({
  organizationId: uuid,
  name: z.string().trim().min(1).max(120),
  query: z.string().trim().min(2).max(200),
  filters: z.string().default("{}"),
  sort: searchSortSchema.default("relevance")
});
export const savedSearchIdSchema = z.object({ savedSearchId: uuid });
export const searchClickSchema = z.object({
  documentId: uuid,
  historyId: uuid,
  position: z.coerce.number().int().positive().optional(),
  routePath: z
    .string()
    .regex(/^\/(?!\/)/)
    .max(500)
});
export const recentItemSchema = z.object({
  documentId: uuid,
  interactionType: z.enum(["view", "open", "continue", "bookmark"]),
  organizationId: uuid
});
export const recommendationEventSchema = z.object({
  eventType: z.enum(["opened", "dismissed", "completed"]),
  recommendationId: uuid,
  routePath: z
    .string()
    .regex(/^\/(?!\/)/)
    .max(500)
    .optional()
});
export const reindexSchema = z.object({
  moduleKey: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]*$/)
    .max(80),
  organizationId: uuid
});
export const synonymSchema = z.object({
  locale: z.string().trim().min(2).max(20).default("en-IN"),
  organizationId: uuid,
  synonyms: z.string().trim().min(2).max(1000),
  term: z.string().trim().min(2).max(100)
});
export const boostRuleSchema = z.object({
  boost: z.coerce.number().min(0).max(20),
  entityType: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1).max(120),
  organizationId: uuid
});
export const recommendationRuleSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_.-]*$/)
    .max(100),
  name: z.string().trim().min(1).max(120),
  organizationId: uuid,
  priority: z.coerce.number().int().min(1).max(1000),
  recommendationType: z.enum([
    "continue_learning",
    "pending_assignment",
    "upcoming_assessment",
    "recommended_certificate",
    "popular_learning",
    "frequently_viewed",
    "recently_updated",
    "role_based",
    "organization",
    "notification_driven"
  ])
});
