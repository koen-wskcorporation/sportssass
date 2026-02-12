import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UploadError } from "@/lib/uploads/errors";

const MAX_ORG_ASSET_SIZE_BYTES = 10 * 1024 * 1024;

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

  throw new UploadError("unsupported_file_type", "Unsupported org asset file type.");
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
  if (file.size > MAX_ORG_ASSET_SIZE_BYTES) {
    throw new UploadError("file_too_large", "Org asset exceeds the 10MB limit.");
  }

  const ext = getExtension(file);
  const path = `orgs/${orgId}/branding/${asset}.${ext}`;

  const bytes = await file.arrayBuffer();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.storage.from("org-assets").upload(path, bytes, {
    contentType: file.type || undefined,
    upsert: true
  });

  if (error) {
    throw new UploadError("storage_upload_failed", `Failed to upload org ${asset}: ${error.message}`);
  }

  return path;
}
