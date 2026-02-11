import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { OrgProvider } from "@/components/shared/org-provider";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;

  return {
    icons: {
      icon: `/app/o/${orgSlug}/icon`
    }
  };
}

export default async function OrgScopedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await getOrgContext(orgSlug, "auth");
  const brandingVars = applyBrandingVars({
    brandPrimary: orgContext.branding.brandPrimary,
    brandSecondary: orgContext.branding.brandSecondary
  });

  return (
    <div style={brandingVars}>
      <OrgProvider value={orgContext}>
        <AppShell orgContext={orgContext}>{children}</AppShell>
      </OrgProvider>
    </div>
  );
}
