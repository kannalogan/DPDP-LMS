import { NextResponse } from "next/server";
import { aiErrorResponse, readAiJsonRequest } from "@/features/ai/execution/http";
import { executeAiLearningChat, executeAiLearningGeneration } from "@/features/ai-learning/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-learning-chat", 10);
    const body = await readAiJsonRequest(request);
    const record = body as Record<string, unknown>;
    const result = record.kind
      ? await executeAiLearningGeneration({ ...record, traceId })
      : await executeAiLearningChat({ ...record, traceId });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId }
    });
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
