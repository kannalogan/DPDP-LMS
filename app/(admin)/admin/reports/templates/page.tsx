import {
  ReportBuilder,
  ReportingHeader,
  ReportingPermissionDenied
} from "@/features/reporting/components";
import { canAccessReporting } from "@/features/reporting/server";
export default async function ReportTemplatesPage() {
  if (!(await canAccessReporting(true))) return <ReportingPermissionDenied />;
  return (
    <>
      <ReportingHeader
        title="Report templates"
        description="Use approved reporting definitions for recurring operational questions."
      />
      <ReportBuilder report={null} />
    </>
  );
}
