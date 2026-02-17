export function getSupabaseCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const
  };
}
