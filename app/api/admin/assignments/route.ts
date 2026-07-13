import { NextResponse } from "next/server";
import { canAccessAssignments, getAssignmentWorkspace } from "@/features/assignments/server";
export async function GET() {
  if (!(await canAccessAssignments("admin")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getAssignmentWorkspace("admin"));
}
