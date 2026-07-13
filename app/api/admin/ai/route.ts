import { NextResponse } from "next/server";
import { canAccessAi, getAiWorkspace } from "@/features/ai/server";
export async function GET() {
  if (!(await canAccessAi("admin")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getAiWorkspace("admin"));
}
