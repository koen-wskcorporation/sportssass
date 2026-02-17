import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function runLogout(request: NextRequest) {
  const destination = new URL("/auth/login", request.url);
  const response = NextResponse.redirect(destination, { status: 303 });

  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  return response;
}

export async function POST(request: NextRequest) {
  return runLogout(request);
}

export async function GET(request: NextRequest) {
  return runLogout(request);
}
