import { NextResponse } from "next/server";
import { canAccessSearch, getSearchWorkspace } from "@/features/search/server";
export async function GET() {
  if (!(await canAccessSearch(true)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getSearchWorkspace(true));
}
