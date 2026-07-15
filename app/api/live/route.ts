import { NextResponse } from "next/server";
import { createLiveSession } from "@/features/community/actions";
import { canAccessCommunity, getCommunityWorkspace } from "@/features/community/server";
export async function GET() {
  if (!(await canAccessCommunity("student")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json((await getCommunityWorkspace("student"))?.liveSessions ?? []);
}
export async function POST(request: Request) {
  if (!(await canAccessCommunity("mentor")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await createLiveSession(await request.json().catch(() => null));
  return NextResponse.json(result, { status: "error" in result ? 400 : 201 });
}
