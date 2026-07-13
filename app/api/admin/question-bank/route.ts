import { NextResponse } from "next/server";
import { getQuestionAuthoringWorkspace } from "@/features/question-authoring/server";

export async function GET() {
  const data = await getQuestionAuthoringWorkspace();
  return NextResponse.json({ data });
}
