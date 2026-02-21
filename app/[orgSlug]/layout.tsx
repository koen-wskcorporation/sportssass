import type { Metadata } from "next";
import { BrandingCssVarsBridge } from "@/components/shared/BrandingCssVarsBridge";
import { OrgHeader } from "@/components/shared/OrgHeader";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";
import { getOrgRequestContext } from "@/lib/org/getOrgRequestContext";
import { listOrgPagesForHeader } from "@/modules/site-builder/db/queries";

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
  const orgRequest = await getOrgRequestContext(orgSlug);
  const canEditPages = orgRequest.capabilities?.pages.canWrite ?? false;
  const [orgLogoUrl, pages] = await Promise.all([
    orgRequest.org.branding.logoPath ? getSignedOrgAssetUrl(orgRequest.org.branding.logoPath, 60 * 10) : Promise.resolve(null),
    listOrgPagesForHeader({
      orgId: orgRequest.org.orgId,
      includeUnpublished: canEditPages
    }).catch(() => [])
  ]);

  const brandingVars = applyBrandingVars({ accent: orgRequest.org.branding.accent });
  const capabilities = orgRequest.capabilities;
  const canManageOrg = capabilities?.manage.canRead ?? false;

  return (
    <>
      <BrandingCssVarsBridge accent={orgRequest.org.branding.accent} />
      <div className="min-h-[calc(100vh-64px)]" style={brandingVars}>
        <OrgHeader
          canEditPages={canEditPages}
          canManageOrg={canManageOrg}
          governingBodyLogoUrl={orgRequest.org.governingBody?.logoUrl ?? null}
          governingBodyName={orgRequest.org.governingBody?.name ?? null}
          pages={pages}
          orgLogoUrl={orgLogoUrl}
          orgName={orgRequest.org.orgName}
          orgSlug={orgRequest.org.orgSlug}
        />
        {children}
      </div>
    </>
  );
}
