import { z } from "zod";

const uuid = z.string().uuid();
const optionalFilter = z.preprocess(
  (value) => (value === "" || Array.isArray(value) ? undefined : value),
  z.string().max(160).optional()
);
export const courseCatalogFiltersSchema = z.object({
  category: optionalFilter,
  query: optionalFilter,
  status: z.preprocess(
    (value) => (Array.isArray(value) ? undefined : value),
    z.enum(["all", "not_started", "in_progress", "completed", "paused"]).optional()
  ),
  track: optionalFilter
});
export const enrollmentCommandSchema = z.object({
  enrollmentId: uuid,
  courseSlug: z.string().min(1).max(160)
});
export const lessonCommandSchema = enrollmentCommandSchema.extend({
  lessonId: uuid,
  lessonSlug: z.string().min(1).max(160)
});
export const lessonProgressSchema = lessonCommandSchema.extend({
  progress: z.coerce.number().min(0).max(99.99)
});
export const noteSchema = lessonCommandSchema.extend({
  body: z.string().trim().min(1).max(20000),
  noteId: z.union([uuid, z.literal("")]).optional()
});
export const noteDeleteSchema = lessonCommandSchema
  .pick({ courseSlug: true, lessonSlug: true })
  .extend({ noteId: uuid });
export const lessonBookmarkSchema = lessonCommandSchema.pick({
  courseSlug: true,
  lessonId: true,
  lessonSlug: true
});
export const resourceBookmarkSchema = lessonCommandSchema
  .pick({ courseSlug: true, lessonSlug: true })
  .extend({ resourceVersionId: uuid });
