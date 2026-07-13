import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function SystemDashboardPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace(true);
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="System health"
        description="Review reporting service health and operational signals."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
