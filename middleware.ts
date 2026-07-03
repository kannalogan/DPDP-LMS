import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security/headers";

export function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  securityHeaders.forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set("X-Request-Id", request.headers.get("x-request-id") ?? crypto.randomUUID());

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
