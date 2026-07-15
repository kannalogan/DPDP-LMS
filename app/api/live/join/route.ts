import { NextResponse } from "next/server";
import { joinLiveSession } from "@/features/community/actions";
export async function POST(request: Request) {
  const result = await joinLiveSession(await request.json().catch(() => null));
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
