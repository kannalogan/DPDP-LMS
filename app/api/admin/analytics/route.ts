import { NextResponse } from "next/server";
import { canAccessReporting, getReportingWorkspace } from "@/features/reporting/server";
export async function GET() {
  if (!(await canAccessReporting(true)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getReportingWorkspace(true);
  return NextResponse.json({
    kpis: data?.kpis ?? [],
    metrics: data?.metrics ?? [],
    health: data?.health ?? []
  });
}
