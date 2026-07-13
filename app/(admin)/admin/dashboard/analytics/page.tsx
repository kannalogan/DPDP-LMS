import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function AdminAnalyticsPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace(true);
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Analytics"
        description="Explore progress, completion, assessment and organization metrics."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
