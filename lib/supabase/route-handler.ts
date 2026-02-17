import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isHttpsRequest, normalizeSupabaseCookieOptions, type SupabaseCookieToSet } from "@/lib/supabase/cookies";

export function createSupabaseRouteHandlerClient(request: NextRequest, response: NextResponse) {
  const { supabaseUrl, supabasePublishableKey } = getSupabasePublicConfig();
  const isHttps = isHttpsRequest(request);

  return createServerClient<any>(supabaseUrl, supabasePublishableKey, {
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
}
