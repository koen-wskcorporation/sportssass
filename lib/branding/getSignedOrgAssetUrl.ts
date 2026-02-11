import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function getSignedOrgAssetUrl(path: string, expiresInSeconds = 60 * 10) {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.storage.from("org-assets").createSignedUrl(path, expiresInSeconds);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
