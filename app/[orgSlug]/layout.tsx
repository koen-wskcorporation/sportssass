import type { Metadata } from "next";
import { OrgHeader } from "@/components/shared/OrgHeader";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";
import { getOrgAssetPublicUrl } from "@/lib/branding/getOrgAssetPublicUrl";
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
  const orgLogoUrl = getOrgAssetPublicUrl(orgRequest.org.branding.logoPath);
  const pages = await listOrgPagesForHeader({
    orgId: orgRequest.org.orgId,
    includeUnpublished: canEditPages
  }).catch(() => []);

  const brandingVars = applyBrandingVars({ accent: orgRequest.org.branding.accent });
  const capabilities = orgRequest.capabilities;
  const canManageOrg = capabilities?.manage.canAccessArea ?? false;

  return (
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
  );
}
