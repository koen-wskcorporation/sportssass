import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  throw new Error("Unsupported avatar file type.");
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const extension = resolveExtension(file);
  const path = `users/${userId}/avatar.${extension}`;
  const bytes = await file.arrayBuffer();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from("account-assets").upload(path, bytes, {
    contentType: file.type || undefined,
    upsert: true
  });

  if (error) {
    throw new Error(`Failed to upload profile avatar: ${error.message}`);
  }

  return path;
}
