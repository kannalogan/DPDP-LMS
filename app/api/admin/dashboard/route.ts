import { NextResponse } from "next/server";
import { getAdminWorkspace } from "@/features/admin/server";

export async function GET() {
  const data = await getAdminWorkspace();
  return NextResponse.json({ data });
}
