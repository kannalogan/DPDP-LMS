import { NextResponse } from "next/server";
import { getMentorWorkspace } from "@/features/mentor/server";

export async function GET() {
  const data = await getMentorWorkspace();
  return NextResponse.json({ data });
}
