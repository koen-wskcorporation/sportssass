import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";

export async function GET(
  request: Request,
  context: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: org } = await supabase
    .from("orgs")
    .select("icon_path")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (org?.icon_path) {
    const signedUrl = await getSignedOrgAssetUrl(org.icon_path, 60 * 5);

    if (signedUrl) {
      const response = NextResponse.redirect(signedUrl, { status: 307 });
      response.headers.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      return response;
    }
  }

  return NextResponse.redirect(new URL("/favicon.ico", request.url), { status: 307 });
}
