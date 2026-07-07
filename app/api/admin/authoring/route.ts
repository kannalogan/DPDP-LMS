import { NextResponse } from "next/server";
import { getAuthoringWorkspace } from "@/features/course-authoring/server";

export async function GET() {
  const data = await getAuthoringWorkspace();
  return NextResponse.json({ data });
}
