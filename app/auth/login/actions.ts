"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cleanValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function validateCredentials(email: string, password: string): string | null {
  if (!email || !password) {
    return "Email and password are required.";
  }

  if (!email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export async function signInAction(formData: FormData) {
  const email = cleanValue(formData.get("email")).toLowerCase();
  const password = cleanValue(formData.get("password"));

  const validationError = validateCredentials(email, password);
  if (validationError) {
    redirect(`/auth/login?mode=signin&error=${encodeURIComponent(validationError)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(
      `/auth/login?mode=signin&error=${encodeURIComponent("Unable to sign in. Check your email and password and try again.")}`
    );
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = cleanValue(formData.get("email")).toLowerCase();
  const password = cleanValue(formData.get("password"));

  const validationError = validateCredentials(email, password);
  if (validationError) {
    redirect(`/auth/login?mode=signup&error=${encodeURIComponent(validationError)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    redirect(
      `/auth/login?mode=signup&error=${encodeURIComponent("Unable to create account. Try a different email or sign in instead.")}`
    );
  }

  if (!data.session) {
    redirect(
      `/auth/login?mode=signin&message=${encodeURIComponent("Account created. Verify your email, then sign in.")}`
    );
  }

  redirect("/");
}
