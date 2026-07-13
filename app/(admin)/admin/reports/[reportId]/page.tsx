import {
  ReportBuilder,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting, getReportingReport } from "@/features/reporting/server";
export default async function ReportDetailPage({
  params
}: {
  params: Promise<{ reportId: string }>;
}) {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  const report = await getReportingReport((await params).reportId);
  return (
    <>
      <ReportingHeader
        title={report?.name ?? "Report"}
        description="Review the report definition and controlled execution options."
      />
      <ReportBuilder report={report} />
    </>
  );
}
