import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/getSessionUser";

export async function requireAuth(): Promise<SessionUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return {
    id: user.id,
    email: user.email ?? null
  };
}
