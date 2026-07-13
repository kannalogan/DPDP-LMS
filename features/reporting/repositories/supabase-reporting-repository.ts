import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapExecution,
  mapHealth,
  mapKpi,
  mapMetric,
  mapReport
} from "@/features/reporting/mappers";
import type { ReportingRepository } from "@/features/reporting/types";
export class SupabaseReportingRepository implements ReportingRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string
  ) {}
  async getWorkspace() {
    const [definitions, executions, kpis, metrics, health] = await Promise.all([
      this.getDefinitions(),
      this.getExecutions(),
      this.getKpis(),
      this.getMetrics(),
      this.getHealth()
    ]);
    return { definitions, executions, kpis, metrics, health };
  }
  async getDefinitions() {
    const { data, error } = await this.client
      .from("report_definitions")
      .select("id,name,description,status,updated_at,version")
      .eq("organization_id", this.organizationId)
      .order("updated_at", { ascending: false });
    return error ? [] : (data ?? []).map((row) => mapReport(row as Record<string, unknown>));
  }
  async getReport(id: string) {
    const { data, error } = await this.client
      .from("report_definitions")
      .select("id,name,description,status,updated_at,version")
      .eq("organization_id", this.organizationId)
      .eq("id", id)
      .maybeSingle();
    return error || !data ? null : mapReport(data as Record<string, unknown>);
  }
  async getExecutions() {
    const { data, error } = await this.client
      .from("report_executions")
      .select("id,report_definition_id,status,row_count,created_at")
      .eq("organization_id", this.organizationId)
      .order("created_at", { ascending: false })
      .limit(20);
    return error ? [] : (data ?? []).map((row) => mapExecution(row as Record<string, unknown>));
  }
  async getKpis() {
    const { data, error } = await this.client
      .from("executive_kpis")
      .select("kpi_key,kpi_value,target_value,trend,as_of_date")
      .eq("organization_id", this.organizationId)
      .order("as_of_date", { ascending: false })
      .limit(30);
    return error ? [] : (data ?? []).map((row) => mapKpi(row as Record<string, unknown>));
  }
  async getMetrics() {
    const { data, error } = await this.client
      .from("analytics_metrics")
      .select("metric_key,metric_value,metric_date")
      .eq("organization_id", this.organizationId)
      .order("metric_date", { ascending: false })
      .limit(60);
    return error ? [] : (data ?? []).map((row) => mapMetric(row as Record<string, unknown>));
  }
  async getHealth() {
    const { data, error } = await this.client
      .from("system_health_snapshots")
      .select("service_key,status,latency_ms,observed_at")
      .eq("organization_id", this.organizationId)
      .order("observed_at", { ascending: false })
      .limit(20);
    return error ? [] : (data ?? []).map((row) => mapHealth(row as Record<string, unknown>));
  }
}
