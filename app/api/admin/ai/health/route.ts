import { NextResponse } from "next/server";
import { aiErrorResponse } from "@/features/ai/execution/http";
import { getAiExecutionAdminOverview } from "@/features/ai/execution/server";
import { enforceServerActionSecurity } from "@/lib/security/request";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-health-read", 30);
    return NextResponse.json(await getAiExecutionAdminOverview(), {
      headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId }
    });
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
