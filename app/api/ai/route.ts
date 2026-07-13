import { NextResponse } from "next/server";
import { canAccessAi, getAiWorkspace } from "@/features/ai/server";
export async function GET() {
  if (!(await canAccessAi("student")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getAiWorkspace("student"));
}
