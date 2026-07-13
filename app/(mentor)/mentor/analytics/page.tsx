import {
  ReportingDashboard,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export default async function MentorAnalyticsPage() {
  if (!(await canAccessReporting())) return <ReportingPermissionDenied />;
  const data = await getReportingWorkspace();
  if (!data) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Mentor analytics"
        description="Review organization-scoped learning and learner activity signals."
      />
      <ReportingDashboard data={data} />
    </>
  );
}
