import {
  ReportingDashboard,
  ReportingEmpty,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function AdminReportsPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace(true);
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Reports"
        description="Build, run and export organization-scoped operational reports."
      />
      {data.definitions.length || data.kpis.length || data.metrics.length ? (
        <ReportingDashboard data={data} />
      ) : (
        <ReportingEmpty />
      )}
    </>
  );
}
