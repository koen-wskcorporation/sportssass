import type { Metadata } from "next";
import { BrandingCssVarsBridge } from "@/components/shared/BrandingCssVarsBridge";
import { OrgHeader } from "@/components/shared/OrgHeader";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";
import { getOptionalOrgMembershipAccess } from "@/lib/org/getOptionalOrgMembershipAccess";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { can } from "@/lib/permissions/can";
import { listOrgNavItems } from "@/modules/site-builder/db/nav-queries";
import { createDefaultOrgNavItems } from "@/modules/site-builder/nav";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

export default async function OrgLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);
  const [orgMembershipAccess, orgLogoUrl, navItems] = await Promise.all([
    getOptionalOrgMembershipAccess(orgContext.orgId),
    orgContext.branding.logoPath ? getSignedOrgAssetUrl(orgContext.branding.logoPath, 60 * 10) : Promise.resolve(null),
    listOrgNavItems(orgContext.orgId).catch(() => createDefaultOrgNavItems())
  ]);

  const brandingVars = applyBrandingVars({ accent: orgContext.branding.accent });
  const canManageOrg = orgMembershipAccess ? can(orgMembershipAccess.permissions, "org.manage.read") : false;
  const canAccessTools = orgMembershipAccess
    ? can(orgMembershipAccess.permissions, "org.manage.read") ||
      can(orgMembershipAccess.permissions, "forms.read") ||
      can(orgMembershipAccess.permissions, "forms.write") ||
      can(orgMembershipAccess.permissions, "sponsors.read") ||
      can(orgMembershipAccess.permissions, "sponsors.write") ||
      can(orgMembershipAccess.permissions, "announcements.read") ||
      can(orgMembershipAccess.permissions, "announcements.write")
    : false;
  const canEditPages = orgMembershipAccess ? can(orgMembershipAccess.permissions, "org.pages.write") : false;

  return (
    <>
      <BrandingCssVarsBridge accent={orgContext.branding.accent} />
      <div className="min-h-[calc(100vh-64px)]" style={brandingVars}>
        <OrgHeader
          canAccessTools={canAccessTools}
          canEditPages={canEditPages}
          canManageOrg={canManageOrg}
          governingBodyLogoUrl={orgContext.governingBody?.logoUrl ?? null}
          governingBodyName={orgContext.governingBody?.name ?? null}
          navItems={navItems}
          orgLogoUrl={orgLogoUrl}
          orgName={orgContext.orgName}
          orgSlug={orgContext.orgSlug}
        />
        {children}
      </div>
    </>
  );
}
