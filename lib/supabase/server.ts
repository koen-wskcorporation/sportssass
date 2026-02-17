import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { normalizeSupabaseCookieOptions, type SupabaseCookieToSet } from "@/lib/supabase/cookies";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isHttps = forwardedProto === "https";
  const { supabaseUrl, supabasePublishableKey } = getSupabasePublicConfig();

  return createServerClient<any>(supabaseUrl, supabasePublishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax"
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, normalizeSupabaseCookieOptions(options, isHttps));
          });
        } catch {
          // Server Components can read cookies but cannot always mutate them.
          // Middleware handles refresh writes in those cases.
        }
      }
    }
  });
}
