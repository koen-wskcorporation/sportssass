import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico"
};

function getExtension(file: File) {
  const byMimeType = extensionByMimeType[file.type];

  if (byMimeType) {
    return byMimeType;
  }

  const fromFileName = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["png", "jpg", "jpeg", "webp", "svg", "ico"].includes(fromFileName)) {
    return fromFileName === "jpeg" ? "jpg" : fromFileName;
  }

  throw new Error("Unsupported file type.");
}

export async function uploadOrgAsset({
  orgId,
  asset,
  file
}: {
  orgId: string;
  asset: "logo" | "icon";
  file: File;
}) {
  const ext = getExtension(file);
  const path = `orgs/${orgId}/branding/${asset}.${ext}`;

  const bytes = await file.arrayBuffer();
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.storage.from("org-assets").upload(path, bytes, {
    contentType: file.type || undefined,
    upsert: true
  });

  if (error) {
    throw new Error(`Failed to upload org ${asset}: ${error.message}`);
  }

  return path;
}
