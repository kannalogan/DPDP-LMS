import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/features/search/server";
import { searchQuerySchema } from "@/features/search/schemas";
export async function GET(request: NextRequest) {
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid search request" }, { status: 400 });
  const filters =
    parsed.data.type && parsed.data.type !== "all" ? { entityTypes: [parsed.data.type] } : {};
  const result = await runSearch(parsed.data.q, filters, parsed.data.sort, parsed.data.page);
  return result
    ? NextResponse.json(result)
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
