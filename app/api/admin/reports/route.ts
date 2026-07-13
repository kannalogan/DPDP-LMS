import { NextResponse } from "next/server";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export async function GET() {
  if (!(await canAccessReporting(true)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getReportingWorkspace(true));
}
