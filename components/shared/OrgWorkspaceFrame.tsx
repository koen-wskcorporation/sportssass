import { AppShell } from "@/components/shared/AppShell";
import { OrgProvider } from "@/components/shared/org-provider";
import { applyBrandingVars } from "@/lib/branding/applyBrandingVars";
import type { ResolvedOrgContext } from "@/lib/tenancy/types";

type OrgWorkspaceFrameProps = {
  orgContext: ResolvedOrgContext;
  children: React.ReactNode;
};

export function OrgWorkspaceFrame({ orgContext, children }: OrgWorkspaceFrameProps) {
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
