import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};

let hasLoggedMiddlewareError = false;

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request
    });

    const { supabaseUrl, supabasePublishableKey } = getSupabasePublicConfig();

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          response = NextResponse.next({
            request
          });

          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });

    // Refreshes auth cookies when needed so server-side auth stays stable.
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && !hasLoggedMiddlewareError) {
      hasLoggedMiddlewareError = true;
      console.error("Supabase middleware refresh failed:", error);
    }

    // Never block requests if auth refresh fails in middleware.
    return NextResponse.next({
      request
    });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
