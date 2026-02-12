import { AppShell } from "@/components/shared/AppShell";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";

export default async function OrgSettingsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "org.branding.write");

  return <AppShell orgContext={orgContext}>{children}</AppShell>;
}
