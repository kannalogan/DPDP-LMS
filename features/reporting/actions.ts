"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveIdentityContext } from "@/features/session/server";
import { canManageReporting } from "@/features/reporting/permissions";
import {
  createReportSchema,
  dashboardWidgetSchema,
  exportReportSchema,
  runReportSchema
} from "@/features/reporting/schemas";
export async function createReport(input: unknown) {
  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid report definition." };
  const identity = await resolveIdentityContext();
  if (
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId ||
    !(await canManageReporting(identity.organizationId))
  )
    return { error: "Reporting permission required." };
  const { data, error } = await (
    await createSupabaseServerClient()
  ).rpc("create_report", {
    p_organization_id: parsed.data.organizationId,
    p_name: parsed.data.name,
    p_definition: parsed.data.definition
  });
  if (error) return { error: "Report could not be created." };
  revalidatePath("/admin/reports");
  return { id: data as string };
}
export async function runReport(input: unknown) {
  const parsed = runReportSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose a valid report." };
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await canManageReporting(identity.organizationId)))
    return { error: "Reporting permission required." };
  const { data, error } = await (
    await createSupabaseServerClient()
  ).rpc("run_report", { p_report_id: parsed.data.reportId, p_parameters: parsed.data.parameters });
  return error ? { error: "Report could not be run." } : { id: data as string };
}
export async function exportReport(input: unknown) {
  const parsed = exportReportSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose a valid export format." };
  const identity = await resolveIdentityContext();
  if (!identity?.organizationId || !(await canManageReporting(identity.organizationId)))
    return { error: "Reporting permission required." };
  const { data, error } = await (
    await createSupabaseServerClient()
  ).rpc("export_report", { p_execution_id: parsed.data.executionId, p_format: parsed.data.format });
  return error ? { error: "Export could not be created." } : { id: data as string };
}
export async function saveDashboardWidget(input: unknown) {
  const parsed = dashboardWidgetSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter valid widget details." };
  const identity = await resolveIdentityContext();
  if (
    !identity?.organizationId ||
    identity.organizationId !== parsed.data.organizationId ||
    !(await canManageReporting(identity.organizationId))
  )
    return { error: "Reporting permission required." };
  const { data, error } = await (
    await createSupabaseServerClient()
  ).rpc("save_dashboard_widget", {
    p_organization_id: parsed.data.organizationId,
    p_widget_type: parsed.data.widgetType,
    p_title: parsed.data.title,
    p_configuration: parsed.data.configuration
  });
  return error ? { error: "Widget could not be saved." } : { id: data as string };
}
