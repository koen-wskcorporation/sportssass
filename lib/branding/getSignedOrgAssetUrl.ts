import "server-only";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

function encodePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function getSignedOrgAssetUrl(path: string, _expiresInSeconds = 60 * 10) {
  const { supabaseUrl } = getSupabasePublicConfig();
  return `${supabaseUrl}/storage/v1/object/public/org-assets/${encodePath(path)}`;
}
