import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url), { status: 303 });
  const supabase = createSupabaseRouteHandlerClient(request, response);

  await supabase.auth.signOut();
  return response;
}
