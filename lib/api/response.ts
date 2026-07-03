import { NextResponse } from "next/server";
import { normalizeError } from "@/lib/api/errors";
import { logger } from "@/lib/observability/logger";

export function apiOk<TData>(data: TData, init?: ResponseInit) {
  return NextResponse.json({ data, ok: true }, init);
}

export function apiError(error: unknown, requestId?: string) {
  const normalized = normalizeError(error);

  logger.error("API request failed", {
    code: normalized.code,
    requestId,
    status: normalized.status
  });

  return NextResponse.json(
    {
      error: {
        code: normalized.code,
        message: normalized.message,
        requestId
      },
      ok: false
    },
    { status: normalized.status }
  );
}
