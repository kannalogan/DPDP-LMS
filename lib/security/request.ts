import { headers } from "next/headers";
import { AppError } from "@/lib/api/errors";
import { rateLimiter } from "@/lib/security/rate-limit";

export async function enforceServerActionSecurity(action: string, limit = 10) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (origin && host && new URL(origin).host !== host) {
    throw new AppError("FORBIDDEN", "Request origin is not allowed");
  }

  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const decision = await rateLimiter.check(`${action}:${forwardedFor}`, limit, 60_000);

  if (!decision.allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again shortly.");
  }

  return {
    correlationId: requestHeaders.get("x-request-id") ?? crypto.randomUUID(),
    forwardedFor,
    userAgent: requestHeaders.get("user-agent") ?? "unknown"
  };
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
