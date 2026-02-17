import { cache } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getGoverningBodyLogoUrl } from "@/lib/org/getGoverningBodyLogoUrl";
import { isReservedOrgSlug } from "@/lib/org/reservedSlugs";
import type { OrgBranding, OrgGoverningBody, OrgPublicContext } from "@/lib/org/types";

function mapBranding(org: {
  logo_path?: string | null;
  icon_path?: string | null;
  brand_primary?: string | null;
}): OrgBranding {
  return {
    logoPath: org.logo_path ?? null,
    iconPath: org.icon_path ?? null,
    accent: org.brand_primary ?? null
  };
}

function mapGoverningBody(governingBody: unknown): OrgGoverningBody | null {
  if (!governingBody || typeof governingBody !== "object") {
    return null;
  }

  const record = Array.isArray(governingBody) ? governingBody[0] : governingBody;

  if (!record || typeof record !== "object") {
    return null;
  }

  const mapped = record as {
    id?: string;
    slug?: string;
    name?: string;
    logo_path?: string;
  };

  if (!mapped.id || !mapped.slug || !mapped.name || !mapped.logo_path) {
    return null;
  }

  return {
    id: mapped.id,
    slug: mapped.slug,
    name: mapped.name,
    logoPath: mapped.logo_path,
    logoUrl: getGoverningBodyLogoUrl(mapped.logo_path)
  };
}

export const getOrgPublicContext = cache(async (orgSlug: string): Promise<OrgPublicContext> => {
  if (isReservedOrgSlug(orgSlug)) {
    notFound();
  }

  const supabase = await createSupabaseServer();
  const { data: orgWithGoverningBody, error: orgWithGoverningBodyError } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_path, icon_path, brand_primary, governing_body:governing_bodies!orgs_governing_body_id_fkey(id, slug, name, logo_path)")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgWithGoverningBodyError) {
    // Keep org pages online if governing body migration has not been applied yet.
    const { data: fallbackOrg, error: fallbackOrgError } = await supabase
      .from("orgs")
      .select("id, slug, name, logo_path, icon_path, brand_primary")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (fallbackOrgError || !fallbackOrg) {
      notFound();
    }

    return {
      orgId: fallbackOrg.id,
      orgSlug: fallbackOrg.slug,
      orgName: fallbackOrg.name,
      branding: mapBranding(fallbackOrg),
      governingBody: null
    };
  }

  if (!orgWithGoverningBody) {
    notFound();
  }

  return {
    orgId: orgWithGoverningBody.id,
    orgSlug: orgWithGoverningBody.slug,
    orgName: orgWithGoverningBody.name,
    branding: mapBranding(orgWithGoverningBody),
    governingBody: mapGoverningBody(orgWithGoverningBody.governing_body)
  };
});
