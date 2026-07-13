import { NextResponse } from "next/server";
import { aiErrorResponse, readAiJsonRequest } from "@/features/ai/execution/http";
import { providerTestSchema } from "@/features/ai/execution/schema";
import { testAiProviderConnection } from "@/features/ai/execution/server";
import { AiExecutionError } from "@/features/ai/errors";
import { enforceServerActionSecurity } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    await enforceServerActionSecurity("ai-provider-test", 3);
    const parsed = providerTestSchema.safeParse(await readAiJsonRequest(request));
    if (!parsed.success) throw new AiExecutionError("validation");
    const result = await testAiProviderConnection(parsed.data.provider);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store", "X-Trace-Id": traceId }
    });
  } catch (error) {
    return aiErrorResponse(error, traceId);
  }
}
