import { NextResponse } from "next/server";
import { recordLiveAttendance } from "@/features/community/actions";
import { canAccessCommunity } from "@/features/community/server";
export async function POST(request: Request) {
  if (!(await canAccessCommunity("mentor")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await recordLiveAttendance(await request.json().catch(() => null));
  return NextResponse.json(result, { status: "error" in result ? 400 : 201 });
}
