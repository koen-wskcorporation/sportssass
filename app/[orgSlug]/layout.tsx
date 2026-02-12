import type { Metadata } from "next";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";
import { OrgHeader } from "@/components/shared/OrgHeader";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { getOptionalOrgMembershipRole } from "@/lib/org/getOptionalOrgMembershipRole";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/${orgSlug}/icon`
    }
  };
}

export default async function PublicOrgLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgPublicContext(orgSlug);
  const brandingVars = applyBrandingVars({
    brandPrimary: orgContext.branding.brandPrimary,
    brandSecondary: orgContext.branding.brandSecondary
  });
  const orgLogoUrl = orgContext.branding.logoPath ? await getSignedOrgAssetUrl(orgContext.branding.logoPath, 60 * 10) : null;
  const membershipRole = await getOptionalOrgMembershipRole(orgContext.orgId);

  return (
    <div className="min-h-screen" style={brandingVars}>
      <OrgHeader membershipRole={membershipRole} orgLogoUrl={orgLogoUrl} orgName={orgContext.orgName} orgSlug={orgContext.orgSlug} />
      {children}
    </div>
  );
}
