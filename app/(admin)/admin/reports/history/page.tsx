import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function ReportHistoryPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace(true);
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Report history"
        description="Inspect recent report executions for the active organization."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
