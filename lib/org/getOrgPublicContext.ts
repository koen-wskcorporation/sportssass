import { cache } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrgPublicContext, OrgBranding } from "@/lib/org/types";
import { isReservedOrgSlug } from "@/lib/org/reservedSlugs";

function mapBranding(org: {
  logo_path?: string | null;
  icon_path?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
}): OrgBranding {
  return {
    logoPath: org.logo_path ?? null,
    iconPath: org.icon_path ?? null,
    brandPrimary: org.brand_primary ?? null,
    brandSecondary: org.brand_secondary ?? null
  };
}

export const getOrgPublicContext = cache(async (orgSlug: string): Promise<OrgPublicContext> => {
  if (isReservedOrgSlug(orgSlug)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: org, error } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_path, icon_path, brand_primary, brand_secondary")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (error || !org) {
    notFound();
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    branding: mapBranding(org)
  };
});
