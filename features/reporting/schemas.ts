import { z } from "zod";
const uuid = z.string().uuid();
export const reportIdSchema = z.object({ reportId: uuid });
export const createReportSchema = z.object({
  organizationId: uuid,
  name: z.string().trim().min(1).max(200),
  definition: z.record(z.unknown()).default({})
});
export const updateReportSchema = createReportSchema.extend({ reportId: uuid });
export const runReportSchema = z.object({
  reportId: uuid,
  parameters: z.record(z.unknown()).default({})
});
export const exportReportSchema = z.object({
  executionId: uuid,
  format: z.enum(["csv", "excel", "pdf_metadata", "json"])
});
export const dashboardWidgetSchema = z.object({
  organizationId: uuid,
  widgetType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  configuration: z.record(z.unknown()).default({})
});
