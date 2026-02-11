import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";

export async function GET(
  request: Request,
  context: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url), { status: 307 });
  }

  const { data: org } = await supabase
    .from("orgs")
    .select("id, icon_path")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org?.id) {
    return NextResponse.redirect(new URL("/favicon.ico", request.url), { status: 307 });
  }

  const { data: membership } = await supabase
    .from("org_memberships")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(new URL("/favicon.ico", request.url), { status: 307 });
  }

  if (org.icon_path) {
    const signedUrl = await getSignedOrgAssetUrl(org.icon_path, 60 * 5);

    if (signedUrl) {
      const response = NextResponse.redirect(signedUrl, { status: 307 });
      response.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=600");
      return response;
    }
  }

  return NextResponse.redirect(new URL("/favicon.ico", request.url), { status: 307 });
}
