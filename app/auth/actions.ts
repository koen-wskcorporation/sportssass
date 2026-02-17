"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

function cleanValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isLikelyEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerStore.get("host");

  if (host) {
    const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://${host}`;
  }

  const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  return fallbackOrigin.replace(/\/+$/, "");
}

export async function signInAction(formData: FormData) {
  const email = cleanValue(formData.get("email")).toLowerCase();
  const password = cleanValue(formData.get("password"));

  if (!isLikelyEmail(email) || !password) {
    redirect("/auth/login?error=1");
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect("/auth/login?error=1");
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = cleanValue(formData.get("email")).toLowerCase();
  const password = cleanValue(formData.get("password"));

  if (!isLikelyEmail(email) || password.length < 8) {
    redirect("/auth/login?mode=signup&error=1");
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    redirect("/auth/login?mode=signup&error=1");
  }

  if (!data.session) {
    redirect("/auth/login?mode=signin&message=signup_check_email");
  }

  redirect("/");
}

export async function signOutAction(_formData: FormData) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = cleanValue(formData.get("email")).toLowerCase();

  if (!isLikelyEmail(email)) {
    redirect("/auth/reset?error=invalid_email");
  }

  const origin = await getRequestOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset?mode=update")}`;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    redirect("/auth/reset?error=reset_request_failed");
  }

  redirect("/auth/reset?message=reset_email_sent");
}

export async function updatePasswordFromResetAction(formData: FormData) {
  const password = cleanValue(formData.get("password"));
  const confirmPassword = cleanValue(formData.get("confirmPassword"));

  if (password.length < 8) {
    redirect("/auth/reset?mode=update&error=weak_password");
  }

  if (confirmPassword !== password) {
    redirect("/auth/reset?mode=update&error=password_mismatch");
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/reset?error=reset_session_missing");
  }

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    redirect("/auth/reset?mode=update&error=password_update_failed");
  }

  await supabase.auth.signOut();
  redirect("/auth/login?message=password_updated");
}
