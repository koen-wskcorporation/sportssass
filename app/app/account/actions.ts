"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadProfileAvatar } from "@/lib/account/uploadProfileAvatar";

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
  const { supabase, user } = await requireUser();

  const firstName = cleanValue(formData.get("firstName"));
  const lastName = cleanValue(formData.get("lastName"));
  const avatar = formData.get("avatar");

  let avatarPath: string | null = null;

  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarPath = await uploadProfileAvatar(user.id, avatar);
    } catch {
      redirect("/app/account?error=avatar_upload_failed");
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
    redirect("/app/account?error=profile_save_failed");
  }

  redirect("/app/account?saved=profile");
}

export async function changeEmailAction(formData: FormData) {
  const { supabase } = await requireUser();
  const email = cleanValue(formData.get("email")).toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/app/account?error=invalid_email");
  }

  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    redirect("/app/account?error=email_update_failed");
  }

  redirect("/app/account?saved=email");
}

export async function changePasswordAction(formData: FormData) {
  const { supabase } = await requireUser();
  const password = cleanValue(formData.get("newPassword"));

  if (password.length < 8) {
    redirect("/app/account?error=weak_password");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/app/account?error=password_update_failed");
  }

  redirect("/app/account?saved=password");
}

export async function sendPasswordResetAction() {
  const { supabase, user } = await requireUser();

  if (!user.email) {
    redirect("/app/account?error=missing_email");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email);

  if (error) {
    redirect("/app/account?error=reset_email_failed");
  }

  redirect("/app/account?saved=reset_email");
}
