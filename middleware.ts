import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isHttpsRequest, normalizeSupabaseCookieOptions, type SupabaseCookieToSet } from "@/lib/supabase/cookies";

const refreshFailureLogWindowEndsAt = Date.now() + 24 * 60 * 60 * 1000;

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request
    });
    const isHttps = isHttpsRequest(request);

    const { supabaseUrl, supabasePublishableKey } = getSupabasePublicConfig();

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookieOptions: {
        path: "/",
        sameSite: "lax"
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, normalizeSupabaseCookieOptions(options, isHttps));
          });
        }
      }
    });

    // Refreshes auth cookies when needed so server-side auth stays stable.
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Supabase middleware refresh failed:", error);
    }

    if (process.env.NODE_ENV === "production" && Date.now() <= refreshFailureLogWindowEndsAt) {
      console.error("TEMP Supabase middleware refresh failed", {
        error,
        host: request.headers.get("host"),
        "x-forwarded-proto": request.headers.get("x-forwarded-proto")
      });
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
