import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerForRequest } from "@/lib/supabase/server";

function normalizeNextPath(nextPath: string | null, fallbackPath: string) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return fallbackPath;
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"), "/");
  const successResponse = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  const supabase = createSupabaseServerForRequest(request, successResponse);

  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return successResponse;
    }
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash
    });

    if (!error) {
      return successResponse;
    }
  }

  return NextResponse.redirect(new URL("/auth/reset?error=callback_failed", request.url), { status: 303 });
}
