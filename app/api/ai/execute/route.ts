import { NextResponse } from "next/server";
import { executeAiCapability } from "@/features/ai/execution/server";
import { aiErrorResponse, readAiJsonRequest } from "@/features/ai/execution/http";
import { enforceServerActionSecurity } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-execute", 5);
    const body = await readAiJsonRequest(request);
    const result = await executeAiCapability({
      ...(body as Record<string, unknown>),
      traceId
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId }
    });
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
