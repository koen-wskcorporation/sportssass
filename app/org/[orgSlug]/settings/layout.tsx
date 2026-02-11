import { PageHeader } from "@/components/ui/page-header";
import { OrgWorkspaceFrame } from "@/components/shared/OrgWorkspaceFrame";
import { requireOrgPermission } from "@/lib/auth/requireOrgPermission";
import { SettingsNav } from "./settings-nav";

export default async function OrgSettingsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.dashboard.read");

  return (
    <OrgWorkspaceFrame orgContext={orgContext}>
      <div className="space-y-6">
        <PageHeader
          description="Manage organization configuration, branding, access, and billing controls."
          title="Organization Settings"
        />
        <SettingsNav orgSlug={orgSlug} />
        {children}
      </div>
    </OrgWorkspaceFrame>
  );
}
