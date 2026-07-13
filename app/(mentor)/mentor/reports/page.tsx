import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function MentorReportsPage() {
  if (!(await canAccessReporting())) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace();
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Mentor reports"
        description="View read-only reporting projections for your active organization."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
