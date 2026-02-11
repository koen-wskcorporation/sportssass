import { cache } from "react";
import { forbidden, notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import type { OrgRole } from "@/modules/core/tools/access";
import type { OrgBranding } from "@/lib/tenancy/types";

export type OrgContextBase = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  branding: OrgBranding;
};

export type OrgContextAuth = OrgContextBase & {
  userId: string;
  membershipRole: OrgRole;
};

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function sanitizeOrgSlug(rawValue: string | string[] | undefined): string | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim().toLowerCase();

  if (!trimmed || !/^[a-z0-9-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function getOrgSlugFromSearchParams(searchParams: SearchParamsLike, key = "org"): string | null {
  if (searchParams instanceof URLSearchParams) {
    return sanitizeOrgSlug(searchParams.get(key) ?? undefined);
  }

  return sanitizeOrgSlug(searchParams[key]);
}

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

async function getPublicOrg(orgSlug: string): Promise<OrgContextBase> {
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
}

async function getAuthOrg(orgSlug: string): Promise<OrgContextAuth> {
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
}

const getOrgContextCached = cache(async (orgSlug: string, mode: "public" | "auth") => {
  if (mode === "public") {
    return getPublicOrg(orgSlug);
  }

  return getAuthOrg(orgSlug);
});

export function getOrgContext(orgSlug: string, mode: "public"): Promise<OrgContextBase>;
export function getOrgContext(orgSlug: string, mode: "auth"): Promise<OrgContextAuth>;
export function getOrgContext(orgSlug: string, mode: "public" | "auth") {
  return getOrgContextCached(orgSlug, mode);
}

export function getOrgContextFromSearchParams(searchParams: SearchParamsLike, mode: "public"): Promise<OrgContextBase>;
export function getOrgContextFromSearchParams(searchParams: SearchParamsLike, mode: "auth"): Promise<OrgContextAuth>;
export function getOrgContextFromSearchParams(searchParams: SearchParamsLike, mode: "public" | "auth") {
  const orgSlug = getOrgSlugFromSearchParams(searchParams);

  if (!orgSlug) {
    if (mode === "auth") {
      redirect("/app?error=org_required");
    }

    notFound();
  }

  if (mode === "auth") {
    return getOrgContext(orgSlug, "auth");
  }

  return getOrgContext(orgSlug, "public");
}
