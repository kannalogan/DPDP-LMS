import { NextResponse } from "next/server";
import { canAccessGovernance, getGovernanceWorkspace } from "@/features/governance/server";
export async function GET() {
  if (!(await canAccessGovernance("governance")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getGovernanceWorkspace("governance"));
}
