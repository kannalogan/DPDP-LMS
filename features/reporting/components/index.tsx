import {
  BarChart3,
  Download,
  FileText,
  HeartPulse,
  LineChart,
  Plus,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReportDefinition, ReportingWorkspace } from "@/features/reporting/types";
import { healthSummary, kpiLabel, reportingStatusTone } from "@/features/reporting/selectors";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState } from "@/shared/ui/feedback";
import "@/features/reporting/reporting.css";
export function ReportingHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="reporting-header">
      <div>
        <span className="student-eyebrow">Enterprise reporting</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={"/admin/reports/new" as Route}>
          <Plus />
          New report
        </Link>
      </Button>
    </header>
  );
}
export function ReportingPermissionDenied() {
  return (
    <ErrorState
      title="Reporting access required"
      description="Your active organization does not grant reporting access."
    />
  );
}
export function ReportingDashboard({ data }: { data: ReportingWorkspace }) {
  return (
    <div className="reporting-shell">
      <KpiCards data={data} />
      <div className="reporting-grid">
        <ReportTable reports={data.definitions.slice(0, 8)} />
        <TrendChart data={data} />
        <OrganizationAnalytics data={data} />
        <SystemHealth data={data} />
      </div>
    </div>
  );
}
export function KpiCards({ data }: { data: ReportingWorkspace }) {
  const kpis = data.kpis.length
    ? data.kpis.slice(0, 4)
    : [{ key: "No KPI data", value: 0, target: null, trend: "stable" as const, asOfDate: "" }];
  return (
    <section className="reporting-kpis">
      {kpis.map((kpi) => (
        <Card className="reporting-card reporting-kpi" key={kpi.key + kpi.asOfDate}>
          <div className="student-card-heading">
            <span className="student-eyebrow">{kpiLabel(kpi)}</span>
            <BarChart3 />
          </div>
          <strong>{kpi.value}</strong>
          <small>{kpi.trend}</small>
        </Card>
      ))}
    </section>
  );
}
export function ReportTable({ reports }: { reports: ReportDefinition[] }) {
  return (
    <Card className="reporting-panel">
      <div className="student-card-heading">
        <h2>Saved reports</h2>
        <FileText />
      </div>
      <Table
        caption="Saved reports"
        columns={[
          { header: "Name", key: "name", render: (row) => row.name },
          {
            header: "Status",
            key: "status",
            render: (row) => <Badge tone={reportingStatusTone(row.status)}>{row.status}</Badge>
          },
          { header: "Version", key: "version", render: (row) => row.version },
          {
            header: "Open",
            key: "open",
            render: (row) => (
              <Button asChild size="sm" variant="ghost">
                <Link href={("/admin/reports/" + row.id) as Route}>Open</Link>
              </Button>
            )
          }
        ]}
        emptyMessage="No saved reports available"
        rows={reports}
      />
    </Card>
  );
}
export function TrendChart({ data }: { data: ReportingWorkspace }) {
  return (
    <Card className="reporting-panel">
      <div className="student-card-heading">
        <h2>Learning trends</h2>
        <LineChart />
      </div>
      <div className="reporting-bars">
        {data.metrics.slice(0, 8).map((metric) => (
          <div key={metric.key + metric.date}>
            <span>{metric.key}</span>
            <progress max={100} value={Math.min(100, Math.max(0, metric.value))} />
          </div>
        ))}
      </div>
    </Card>
  );
}
export function OrganizationAnalytics({ data }: { data: ReportingWorkspace }) {
  return (
    <Card className="reporting-panel">
      <div className="student-card-heading">
        <h2>Organization analytics</h2>
        <ShieldCheck />
      </div>
      <p>
        {data.kpis.length} KPIs and {data.metrics.length} metrics are available for the active
        organization.
      </p>
      <Button asChild size="sm" variant="secondary">
        <Link href={"/admin/dashboard/analytics" as Route}>
          <BarChart3 />
          Explore analytics
        </Link>
      </Button>
    </Card>
  );
}
export function SystemHealth({ data }: { data: ReportingWorkspace }) {
  return (
    <Card className="reporting-panel">
      <div className="student-card-heading">
        <h2>System health</h2>
        <HeartPulse />
      </div>
      <p>{healthSummary(data.health)}</p>
      {data.health.length ? (
        <div className="reporting-list">
          {data.health.slice(0, 5).map((item) => (
            <div key={item.serviceKey + item.observedAt}>
              <span>{item.serviceKey}</span>
              <Badge tone={reportingStatusTone(item.status)}>{item.status}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Health snapshots appear after the reporting runtime records them."
          title="No health snapshots"
        />
      )}
    </Card>
  );
}
export function ReportBuilder({ report }: { report: ReportDefinition | null }) {
  return (
    <Card className="reporting-panel">
      <h2>{report?.name ?? "New report"}</h2>
      <p>Report definitions are validated and saved through controlled server actions.</p>
      <Button variant="secondary">
        <Download />
        Export metadata
      </Button>
    </Card>
  );
}
export function ReportingEmpty() {
  return (
    <EmptyState
      description="Create a report or wait for organization analytics to be recorded."
      title="No reporting data"
    />
  );
}
