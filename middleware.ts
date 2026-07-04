import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ORGANIZATION_COOKIE } from "@/features/session/constants";
import { securityHeaders } from "@/lib/security/headers";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const guestRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];
const protectedPrefixes = ["/account", "/invite"];

export async function middleware(request: NextRequest) {
  const { client, response, user } = await refreshSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  if (!user && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user && guestRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/account/profile", request.url));
  }

  const selectedOrganization = request.cookies.get(ORGANIZATION_COOKIE)?.value;
  if (user && selectedOrganization && pathname.startsWith("/account")) {
    const { data } = await client
      .from("organization_members")
      .select("id")
      .eq("organization_id", selectedOrganization)
      .eq("profile_id", user.id)
      .eq("status", "active")
      .is("ended_at", null)
      .maybeSingle();
    if (!data) response.cookies.delete(ORGANIZATION_COOKIE);
  }

  securityHeaders.forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set("X-Request-Id", request.headers.get("x-request-id") ?? crypto.randomUUID());

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
