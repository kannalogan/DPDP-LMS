import type { ReportDefinition, ReportingHealth, ReportingKpi } from "@/features/reporting/types";
export const reportingStatusTone = (status: string) =>
  status === "healthy" || status === "active"
    ? "success"
    : status === "degraded"
      ? "warning"
      : "danger";
export const kpiLabel = (kpi: ReportingKpi) => kpi.key.replaceAll("_", " ");
export const reportLabel = (report: ReportDefinition) => report.name || "Untitled report";
export const healthSummary = (health: ReportingHealth[]) =>
  health.every((item) => item.status === "healthy")
    ? "All reporting services healthy"
    : "Reporting services need attention";
