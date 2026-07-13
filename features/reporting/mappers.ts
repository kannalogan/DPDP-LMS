import type {
  ReportDefinition,
  ReportExecution,
  ReportingHealth,
  ReportingKpi,
  ReportingMetric
} from "@/features/reporting/types";
type Row = Record<string, unknown>;
const text = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const number = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
const nullableNumber = (v: unknown) => (v === null || v === undefined ? null : number(v));
export function mapReport(row: Row): ReportDefinition {
  return {
    id: text(row.id),
    name: text(row.name, "Report"),
    description: text(row.description),
    status: text(row.status, "active") as ReportDefinition["status"],
    updatedAt: text(row.updated_at),
    version: number(row.version)
  };
}
export function mapExecution(row: Row): ReportExecution {
  return {
    id: text(row.id),
    reportId: typeof row.report_definition_id === "string" ? row.report_definition_id : null,
    status: text(row.status),
    rowCount: number(row.row_count),
    createdAt: text(row.created_at)
  };
}
export function mapKpi(row: Row): ReportingKpi {
  return {
    key: text(row.kpi_key),
    value: number(row.kpi_value),
    target: nullableNumber(row.target_value),
    trend: text(row.trend, "stable") as ReportingKpi["trend"],
    asOfDate: text(row.as_of_date)
  };
}
export function mapMetric(row: Row): ReportingMetric {
  return {
    key: text(row.metric_key),
    value: number(row.metric_value),
    date: text(row.metric_date)
  };
}
export function mapHealth(row: Row): ReportingHealth {
  return {
    serviceKey: text(row.service_key),
    status: text(row.status),
    latencyMs: nullableNumber(row.latency_ms),
    observedAt: text(row.observed_at)
  };
}
