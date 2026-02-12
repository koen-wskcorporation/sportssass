import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSitePageLayout, type SitePageKey } from "@/modules/site-builder/registry";
import type { SitePageContext, SitePageLayout } from "@/modules/site-builder/types";

type SitePageLookup = SitePageContext & {
  orgId: string;
  pageKey: SitePageKey;
};

export async function getPublishedSitePageLayout({ orgId, pageKey, orgName, orgSlug }: SitePageLookup): Promise<SitePageLayout> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("org_site_pages")
    .select("layout")
    .eq("org_id", orgId)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error || !data) {
    return normalizeSitePageLayout(pageKey, null, {
      orgName,
      orgSlug
    });
  }

  return normalizeSitePageLayout(pageKey, data.layout, {
    orgName,
    orgSlug
  });
}

export async function publishSitePageLayout({
  orgId,
  pageKey,
  layout
}: {
  orgId: string;
  pageKey: SitePageKey;
  layout: SitePageLayout;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("org_site_pages").upsert(
    {
      org_id: orgId,
      page_key: pageKey,
      layout,
      published_at: new Date().toISOString()
    },
    {
      onConflict: "org_id,page_key"
    }
  );

  if (error) {
    throw new Error(`Failed to publish site page: ${error.message}`);
  }
}
