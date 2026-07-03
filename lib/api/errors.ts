export type AppErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details: unknown | undefined;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.status = statusByCode[code];
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("INTERNAL_SERVER_ERROR", error.message);
  }

  return new AppError("INTERNAL_SERVER_ERROR", "Unexpected application error");
}
