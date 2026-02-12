import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UploadError } from "@/lib/uploads/errors";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg"
};

function resolveExtension(file: File) {
  const fromMime = extensionByMimeType[file.type];

  if (fromMime) {
    return fromMime;
  }

  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && ["png", "jpg", "jpeg", "webp", "svg"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  throw new UploadError("unsupported_file_type", "Unsupported avatar file type.");
}

export async function uploadProfileAvatar(userId: string, file: File) {
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new UploadError("file_too_large", "Avatar file exceeds the 5MB limit.");
  }

  const extension = resolveExtension(file);
  const path = `users/${userId}/avatar.${extension}`;
  const bytes = await file.arrayBuffer();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from("account-assets").upload(path, bytes, {
    contentType: file.type || undefined,
    upsert: true
  });

  if (error) {
    throw new UploadError("storage_upload_failed", `Failed to upload profile avatar: ${error.message}`);
  }

  return path;
}
