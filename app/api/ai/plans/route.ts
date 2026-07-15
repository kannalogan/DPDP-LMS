import { NextResponse } from "next/server";
import { aiErrorResponse, readAiJsonRequest } from "@/features/ai/execution/http";
import { executeAiLearningGeneration } from "@/features/ai-learning/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-learning-plans", 5);
    const body = (await readAiJsonRequest(request)) as Record<string, unknown>;
    const kind = body.kind === "revision_plan" ? "revision_plan" : "learning_plan";
    return NextResponse.json(await executeAiLearningGeneration({ ...body, kind }), {
      headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId }
    });
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
