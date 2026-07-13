import type { ReportingKpi, ReportingMetric } from "@/features/reporting/types";
export function calculateRate(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : Math.round((numerator / denominator) * 10000) / 100;
}
export function summarizeKpis(kpis: ReportingKpi[]) {
  return kpis.reduce((sum, kpi) => sum + kpi.value, 0);
}
export function groupMetricsByKey(metrics: ReportingMetric[]) {
  return metrics.reduce<Record<string, ReportingMetric[]>>((groups, metric) => {
    (groups[metric.key] ??= []).push(metric);
    return groups;
  }, {});
}
