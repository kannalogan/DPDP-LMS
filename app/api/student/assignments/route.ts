import { NextResponse } from "next/server";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export async function GET() {
  if (!(await canAccessAssignments("student")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getAssignmentWorkspace("student");
  return NextResponse.json({
    assignments: data?.assignments ?? [],
    gradebook: data?.gradebook ?? []
  });
}
