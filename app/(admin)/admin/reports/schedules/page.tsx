import { ReportingHeader, ReportingPermissionDenied } from "@/features/reporting/components";
import { canAccessReporting } from "@/features/reporting/server";
export default async function ReportSchedulesPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Report schedules"
        description="Review organization report schedules and delivery status."
      />
      <p>No active schedules are configured.</p>
    </>
  );
}
