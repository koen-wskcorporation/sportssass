import type { Metadata } from "next";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/o/${orgSlug}/icon`
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
  const orgContext = await getOrgContext(orgSlug, "public");
  const brandingVars = applyBrandingVars({
    brandPrimary: orgContext.branding.brandPrimary,
    brandSecondary: orgContext.branding.brandSecondary
  });

  return (
    <div className="min-h-screen" style={brandingVars}>
      {children}
    </div>
  );
}
