export type ReportingFormat = "csv" | "excel" | "pdf_metadata" | "json";
export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  updatedAt: string;
  version: number;
};
export type ReportExecution = {
  id: string;
  reportId: string | null;
  status: string;
  rowCount: number;
  createdAt: string;
};
export type ReportingKpi = {
  key: string;
  value: number;
  target: number | null;
  trend: "up" | "down" | "stable";
  asOfDate: string;
};
export type ReportingMetric = { key: string; value: number; date: string };
export type ReportingHealth = {
  serviceKey: string;
  status: string;
  latencyMs: number | null;
  observedAt: string;
};
export type ReportingWorkspace = {
  definitions: ReportDefinition[];
  executions: ReportExecution[];
  kpis: ReportingKpi[];
  metrics: ReportingMetric[];
  health: ReportingHealth[];
};
export type ReportingRepository = {
  getWorkspace(): Promise<ReportingWorkspace>;
  getReport(id: string): Promise<ReportDefinition | null>;
};
