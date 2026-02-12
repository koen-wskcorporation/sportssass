import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";
import { getOptionalOrgMembershipRole } from "@/lib/org/getOptionalOrgMembershipRole";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { can } from "@/lib/permissions/can";
import { SitePageBuilder } from "@/modules/site-builder/components/SitePageBuilder";
import { getPublishedSitePageLayout } from "@/modules/site-builder/db/queries";
import type { SitePageKey } from "@/modules/site-builder/registry";

export async function renderOrgPage({
  orgSlug,
  pageKey,
  searchParams
}: {
  orgSlug: string;
  pageKey: SitePageKey;
  searchParams?: {
    edit?: string;
  };
}) {
  const orgContext = await getOrgPublicContext(orgSlug);
  const [membershipRole, orgLogoUrl, initialLayout] = await Promise.all([
    getOptionalOrgMembershipRole(orgContext.orgId),
    orgContext.branding.logoPath ? getSignedOrgAssetUrl(orgContext.branding.logoPath, 60 * 10) : Promise.resolve(null),
    getPublishedSitePageLayout({
      orgId: orgContext.orgId,
      orgName: orgContext.orgName,
      orgSlug: orgContext.orgSlug,
      pageKey
    })
  ]);

  const canEdit = membershipRole ? can(membershipRole, "org.site.write") : false;
  const initialEditMode = canEdit && searchParams?.edit === "1";

  return (
    <SitePageBuilder
      canEdit={canEdit}
      initialEditMode={initialEditMode}
      initialLayout={initialLayout}
      orgLogoUrl={orgLogoUrl}
      orgName={orgContext.orgName}
      orgSlug={orgContext.orgSlug}
      pageKey={pageKey}
    />
  );
}
