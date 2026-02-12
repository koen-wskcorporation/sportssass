import { cache } from "react";
import { forbidden, notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import type { OrgRole } from "@/modules/core/tools/access";
import type { OrgAuthContext, OrgBranding } from "@/lib/org/types";
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

export const getOrgAuthContext = cache(async (orgSlug: string): Promise<OrgAuthContext> => {
  if (isReservedOrgSlug(orgSlug)) {
    notFound();
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  const supabase = await createSupabaseServerClient();
  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .select("id, slug, name, logo_path, icon_path, brand_primary, brand_secondary")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgError || !org) {
    notFound();
  }

  const { data: membership, error: membershipError } = await supabase
    .from("org_memberships")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    forbidden();
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    userId: user.id,
    membershipRole: membership.role as OrgRole,
    branding: mapBranding(org)
  };
});
