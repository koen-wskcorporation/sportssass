import { createClient } from "@supabase/supabase-js";

let serviceRoleClient: ReturnType<typeof createClient<any>> | null = null;

function getServiceKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function createClientWithServiceKey(supabaseUrl: string, serviceKey: string) {
  return createClient<any>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createSupabaseServiceRoleClient() {
  if (!serviceRoleClient) {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getServiceKey();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY (SUPABASE_SERVICE_ROLE_KEY fallback).");
    }

    serviceRoleClient = createClientWithServiceKey(supabaseUrl, serviceRoleKey);
  }

  return serviceRoleClient;
}

export function createOptionalSupabaseServiceRoleClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClientWithServiceKey(supabaseUrl, serviceRoleKey);
}
