"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadProfileAvatar } from "@/lib/account/uploadProfileAvatar";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { isUploadError } from "@/lib/uploads/errors";

function cleanValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

export async function saveProfileAction(formData: FormData) {
  try {
    const { supabase, user } = await requireUser();

    const firstName = cleanValue(formData.get("firstName"));
    const lastName = cleanValue(formData.get("lastName"));
    const avatar = formData.get("avatar");

    let avatarPath: string | null = null;

    if (avatar instanceof File && avatar.size > 0) {
      try {
        avatarPath = await uploadProfileAvatar(user.id, avatar);
      } catch (error) {
        if (isUploadError(error)) {
          switch (error.code) {
            case "unsupported_file_type":
              redirect("/account?error=unsupported_file_type");
            case "file_too_large":
              redirect("/account?error=file_too_large");
            default:
              redirect("/account?error=avatar_upload_failed");
          }
        }

        redirect("/account?error=avatar_upload_failed");
      }
    }

    const updates: {
      user_id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_path?: string | null;
    } = {
      user_id: user.id,
      first_name: firstName || null,
      last_name: lastName || null
    };

    if (avatarPath) {
      updates.avatar_path = avatarPath;
    }

    const { error } = await supabase.from("user_profiles").upsert(updates, {
      onConflict: "user_id"
    });

    if (error) {
      redirect("/account?error=profile_save_failed");
    }

    redirect("/account?saved=profile");
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect("/account?error=service_unavailable");
  }
}

export async function changePasswordAction(formData: FormData) {
  try {
    const { supabase } = await requireUser();
    const password = cleanValue(formData.get("newPassword"));

    if (password.length < 8) {
      redirect("/account?error=weak_password");
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      redirect("/account?error=password_update_failed");
    }

    redirect("/account?saved=password");
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect("/account?error=service_unavailable");
  }
}
