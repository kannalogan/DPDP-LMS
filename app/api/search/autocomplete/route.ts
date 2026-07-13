import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/features/search/server";
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 2 || query.length > 100)
    return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
  return NextResponse.json(await getSearchSuggestions(query));
}
