import { describe, expect, it } from "vitest";
import {
  classifyRegistrationFailure,
  registrationFailureResult
} from "@/features/auth/registration-errors";

const traceId = "12345678-1234-4234-8234-123456789abc";

describe("registration error handling", () => {
  it("identifies an unavailable Supabase Auth endpoint without exposing raw details", () => {
    const failure = classifyRegistrationFailure({
      message: "fetch failed",
      name: "AuthRetryableFetchError",
      status: 0
    });

    expect(failure.kind).toBe("unavailable");
    expect(registrationFailureResult(failure, traceId)).toEqual({
      error: `Account services are temporarily unavailable. Try again shortly. Reference: ${traceId}`,
      success: false
    });
  });

  it("handles duplicate registration without confirming account existence", () => {
    const failure = classifyRegistrationFailure({ code: "user_already_exists", status: 422 });

    expect(registrationFailureResult(failure, traceId)).toEqual({
      message: "If this address can be registered, a verification email will be sent.",
      success: true
    });
  });

  it("maps provider validation errors to safe field errors", () => {
    expect(
      registrationFailureResult(
        classifyRegistrationFailure({ code: "weak_password", status: 422 }),
        traceId
      )
    ).toEqual({
      fieldErrors: { password: ["Password does not meet account security requirements"] },
      success: false
    });
  });
});
