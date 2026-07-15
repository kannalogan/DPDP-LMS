import { NextResponse } from "next/server";
import { sendMessageAction } from "@/features/community/actions";
import { canAccessCommunity, getCommunityWorkspace } from "@/features/community/server";
export async function GET() {
  if (!(await canAccessCommunity("student")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json((await getCommunityWorkspace("student"))?.conversations ?? []);
}
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = new FormData();
  for (const [key, value] of Object.entries(payload))
    if (typeof value === "string") data.set(key, value);
  const result = await sendMessageAction(data);
  return NextResponse.json(result, { status: result.success ? 201 : 400 });
}
