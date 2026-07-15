import type { ActionResult } from "@/types/identity";

export type RegistrationFailureKind =
  | "duplicate"
  | "invalid-email"
  | "rate-limited"
  | "signup-disabled"
  | "unavailable"
  | "unexpected"
  | "weak-password";

export interface RegistrationFailure {
  code: string | null;
  kind: RegistrationFailureKind;
  name: string;
  status: number | null;
}

function property(error: unknown, key: string): unknown {
  return typeof error === "object" && error !== null ? Reflect.get(error, key) : undefined;
}

export function classifyRegistrationFailure(error: unknown): RegistrationFailure {
  const code = typeof property(error, "code") === "string" ? String(property(error, "code")) : null;
  const message =
    typeof property(error, "message") === "string"
      ? String(property(error, "message")).toLowerCase()
      : "";
  const name =
    typeof property(error, "name") === "string" ? String(property(error, "name")) : "Error";
  const status =
    typeof property(error, "status") === "number" ? Number(property(error, "status")) : null;

  let kind: RegistrationFailureKind = "unexpected";
  if (code === "user_already_exists" || code === "email_exists") kind = "duplicate";
  else if (code === "email_address_invalid" || code === "validation_failed") kind = "invalid-email";
  else if (code === "weak_password") kind = "weak-password";
  else if (code === "signup_disabled") kind = "signup-disabled";
  else if (status === 429 || code === "over_email_send_rate_limit") kind = "rate-limited";
  else if (
    status === 0 ||
    name === "AuthRetryableFetchError" ||
    message === "fetch failed" ||
    message.includes("failed to fetch")
  )
    kind = "unavailable";

  return { code, kind, name, status };
}

export function registrationFailureResult(
  failure: RegistrationFailure,
  traceId: string
): ActionResult {
  switch (failure.kind) {
    case "duplicate":
      return {
        message: "If this address can be registered, a verification email will be sent.",
        success: true
      };
    case "invalid-email":
      return { fieldErrors: { email: ["Enter a valid work email address"] }, success: false };
    case "weak-password":
      return {
        fieldErrors: { password: ["Password does not meet account security requirements"] },
        success: false
      };
    case "signup-disabled":
      return { error: "Account registration is currently unavailable.", success: false };
    case "rate-limited":
      return { error: "Please wait before trying to register again.", success: false };
    case "unavailable":
      return {
        error: `Account services are temporarily unavailable. Try again shortly. Reference: ${traceId}`,
        success: false
      };
    default:
      return {
        error: `We could not complete that request. Reference: ${traceId}`,
        success: false
      };
  }
}
