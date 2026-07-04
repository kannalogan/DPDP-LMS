import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/account/profile";
  if (!code)
    return NextResponse.redirect(new URL("/auth/login?error=invalid_callback", request.url));

  const client = await createSupabaseServerClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/auth/login?error=verification_failed", request.url));
  await client.rpc("syra_mark_profile_verified");
  return NextResponse.redirect(new URL(next, request.url));
}
