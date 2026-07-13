import { NextResponse } from "next/server";
import { AiExecutionError, safeAiErrorResponse } from "@/features/ai/errors";

export const AI_REQUEST_MAX_BYTES = 131072;

export async function readAiJsonRequest(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > AI_REQUEST_MAX_BYTES)
    throw new AiExecutionError("validation", { status: 413 });
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > AI_REQUEST_MAX_BYTES)
      throw new AiExecutionError("validation", { status: 413 });
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof AiExecutionError) throw error;
    throw new AiExecutionError("validation", { status: 400 });
  }
}

export function aiErrorResponse(error: unknown, traceId: string) {
  const safe = safeAiErrorResponse(error, traceId);
  return NextResponse.json(safe.body, {
    headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId },
    status: safe.status
  });
}
