import {
  ReportBuilder,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting } from "@/features/reporting/server";
export default async function NewReportPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="New report"
        description="Define a saved report for the active organization."
      />
      <ReportBuilder report={null} />
    </>
  );
}
