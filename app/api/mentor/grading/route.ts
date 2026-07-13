import { NextResponse } from "next/server";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export async function GET() {
  if (!(await canAccessAssignments("mentor")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getAssignmentWorkspace("mentor");
  return NextResponse.json({ items: data?.gradingQueue ?? [] });
}
