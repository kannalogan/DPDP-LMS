import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function ExecutiveDashboardPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace(true);
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Executive dashboard"
        description="Monitor organization KPIs and trends at a glance."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
