import { NextResponse } from "next/server";
import { z } from "zod";
import { aiErrorResponse, readAiJsonRequest } from "@/features/ai/execution/http";
import {
  executeAiLearningGeneration,
  getAiLearningQuizQuestions
} from "@/features/ai-learning/server";
import { enforceServerActionSecurity } from "@/lib/security/request";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("quizId"));
  if (!id.success) return NextResponse.json([], { status: 400 });
  return NextResponse.json(await getAiLearningQuizQuestions(id.data), {
    headers: { "Cache-Control": "no-store" }
  });
}
export async function POST(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-learning-quizzes", 5);
    const body = await readAiJsonRequest(request);
    return NextResponse.json(
      await executeAiLearningGeneration({ ...(body as Record<string, unknown>), kind: "quiz" }),
      { headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId } }
    );
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
