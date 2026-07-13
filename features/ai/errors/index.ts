import type { AiProviderKey } from "@/features/ai/execution/types";

export type AiFailureClass =
  | "authentication"
  | "budget_exceeded"
  | "circuit_open"
  | "content_policy"
  | "forbidden"
  | "invalid_request"
  | "kill_switch"
  | "overloaded"
  | "permission"
  | "rate_limited"
  | "timeout"
  | "transient"
  | "unavailable"
  | "validation";

const safeMessages: Record<AiFailureClass, string> = {
  authentication: "The configured AI provider could not authenticate.",
  budget_exceeded: "The AI budget limit has been reached.",
  circuit_open: "The AI provider is temporarily unavailable.",
  content_policy: "The request could not be processed under the active AI safety policy.",
  forbidden: "This AI operation is not permitted.",
  invalid_request: "The AI request was not accepted by the provider.",
  kill_switch: "AI execution is currently disabled.",
  overloaded: "The AI provider is temporarily overloaded.",
  permission: "AI access is not permitted for this account.",
  rate_limited: "The AI provider rate limit was reached.",
  timeout: "The AI request timed out.",
  transient: "The AI provider encountered a temporary error.",
  unavailable: "No approved AI provider is available.",
  validation: "The AI request did not pass validation."
};

export class AiExecutionError extends Error {
  readonly failureClass: AiFailureClass;
  readonly httpStatus: number | null;
  readonly provider: AiProviderKey | null;
  readonly providerCode: string | null;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    failureClass: AiFailureClass,
    options: {
      httpStatus?: number | null;
      provider?: AiProviderKey | null;
      providerCode?: string | null | undefined;
      retryable?: boolean;
      status?: number;
    } = {}
  ) {
    super(safeMessages[failureClass]);
    this.name = "AiExecutionError";
    this.failureClass = failureClass;
    this.httpStatus = options.httpStatus ?? null;
    this.provider = options.provider ?? null;
    this.providerCode = sanitizeProviderCode(options.providerCode);
    this.retryable = options.retryable ?? false;
    this.status = options.status ?? statusForFailure(failureClass);
  }
}

function statusForFailure(failureClass: AiFailureClass) {
  if (failureClass === "permission" || failureClass === "forbidden") return 403;
  if (failureClass === "validation" || failureClass === "invalid_request") return 422;
  if (failureClass === "budget_exceeded" || failureClass === "rate_limited") return 429;
  if (failureClass === "kill_switch" || failureClass === "unavailable") return 503;
  return 502;
}

export function sanitizeProviderCode(value: string | null | undefined) {
  if (!value) return null;
  const safe = value.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 100);
  return safe || null;
}

export function normalizeProviderHttpError(
  provider: AiProviderKey,
  status: number,
  providerCode?: string | null
) {
  if (status === 400 || status === 404 || status === 413 || status === 422)
    return new AiExecutionError("invalid_request", {
      httpStatus: status,
      provider,
      providerCode
    });
  if (status === 401)
    return new AiExecutionError("authentication", {
      httpStatus: status,
      provider,
      providerCode
    });
  if (status === 403)
    return new AiExecutionError("forbidden", { httpStatus: status, provider, providerCode });
  if (status === 408 || status === 504)
    return new AiExecutionError("timeout", {
      httpStatus: status,
      provider,
      providerCode,
      retryable: true
    });
  if (status === 429)
    return new AiExecutionError("rate_limited", {
      httpStatus: status,
      provider,
      providerCode,
      retryable: true
    });
  if (status === 529)
    return new AiExecutionError("overloaded", {
      httpStatus: status,
      provider,
      providerCode,
      retryable: true
    });
  if (status >= 500)
    return new AiExecutionError("transient", {
      httpStatus: status,
      provider,
      providerCode,
      retryable: true
    });
  return new AiExecutionError("unavailable", { httpStatus: status, provider, providerCode });
}

export function safeAiErrorResponse(error: unknown, traceId: string) {
  const normalized =
    error instanceof AiExecutionError ? error : new AiExecutionError("unavailable");
  return {
    body: { code: normalized.failureClass, error: normalized.message, traceId },
    status: normalized.status
  };
}
