import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOptionalSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function getSignedOrgAssetUrl(path: string, expiresInSeconds = 60 * 10) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage.from("org-assets").createSignedUrl(path, expiresInSeconds);

  if (!error) {
    return data.signedUrl;
  }

  const serviceRoleClient = createOptionalSupabaseServiceRoleClient();
  if (!serviceRoleClient) {
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await serviceRoleClient.storage
    .from("org-assets")
    .createSignedUrl(path, expiresInSeconds);

  if (fallbackError) {
    return null;
  }

  return fallbackData.signedUrl;
}
