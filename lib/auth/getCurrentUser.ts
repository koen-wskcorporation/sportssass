import { createSupabaseServer } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getSignedProfileAvatarUrl } from "@/lib/account/getSignedProfileAvatarUrl";

export type CurrentUser = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return null;
    }

    const supabase = await createSupabaseServer();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, avatar_path")
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    const avatarPath = profile?.avatar_path ?? null;
    const avatarUrl = avatarPath ? await getSignedProfileAvatarUrl(avatarPath, 60 * 10) : null;

    return {
      userId: sessionUser.id,
      email: sessionUser.email,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      avatarPath,
      avatarUrl
    };
  } catch {
    return null;
  }
}
