import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function cleanValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = cleanValue(formData.get("email")).toLowerCase();
  const password = cleanValue(formData.get("password"));

  if (!email || !password) {
    return NextResponse.redirect(new URL("/auth/login?error=1", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=1", request.url), { status: 303 });
  }

  return response;
}
