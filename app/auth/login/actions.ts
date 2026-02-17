"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

function getCredential(formData: FormData, key: "email" | "password") {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
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

export async function login(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getCredential(formData, "email").toLowerCase();
  const password = getCredential(formData, "password");

  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: "Unable to sign in. Check your email and password and try again." };
    }

    return {
      success: "Signed in.",
      redirectTo: "/"
    };
  } catch {
    return { error: "We could not reach the auth service. Please try again in a moment." };
  }
}

export async function signup(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getCredential(formData, "email").toLowerCase();
  const password = getCredential(formData, "password");

  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return { error: "Unable to create account. Try a different email or sign in instead." };
    }

    if (!data.session) {
      return { success: "Account created. Verify your email, then sign in." };
    }

    return {
      success: "Account created.",
      redirectTo: "/"
    };
  } catch {
    return { error: "We could not reach the auth service. Please try again in a moment." };
  }
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return {
    redirectTo: "/auth/login"
  };
}
