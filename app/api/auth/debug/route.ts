import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function parseCookieNames(cookieHeader: string | null) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const cookieNames = parseCookieNames(cookieHeader);
  const sbCookieNames = cookieNames.filter((name) => name.startsWith("sb-"));
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  return NextResponse.json({
    host: request.headers.get("host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    cookieHeaderPresent: cookieHeader !== null,
    cookieNames,
    sbCookieNames,
    hasSbCookies: sbCookieNames.length > 0,
    getUserSucceeded: !error && Boolean(user),
    supabaseUserId: user?.id ?? null
  });
}
