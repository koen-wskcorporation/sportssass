import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getCookieNamesFromHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const requestCookieHeader = request.headers.get("cookie");
  const requestCookieNames = getCookieNamesFromHeader(requestCookieHeader);
  const serverCookieNames = cookieStore.getAll().map((cookie) => cookie.name);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return NextResponse.json({
    host: request.headers.get("host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    requestCookieNames,
    serverCookieNames,
    supabaseUserId: user?.id ?? null
  });
}
