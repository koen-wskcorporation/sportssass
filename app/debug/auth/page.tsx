import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebugAuthPage() {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  const supabaseCookieNames = cookieNames.filter((name) => name.startsWith("sb-"));

  return (
    <main className="app-container py-8 md:py-10">
      <div className="space-y-4 rounded-card border bg-surface p-5">
        <h1 className="text-lg font-semibold text-text">Auth Debug</h1>
        <pre className="overflow-x-auto rounded-control border bg-surface-muted p-3 text-xs text-text">
          {JSON.stringify(
            {
              hasUser: Boolean(user),
              userId: user?.id ?? null,
              email: user?.email ?? null,
              authError: error?.message ?? null,
              cookieNames,
              supabaseCookieNames
            },
            null,
            2
          )}
        </pre>
      </div>
    </main>
  );
}
