import { AppShell } from "@/components/shared/AppShell";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";

export default async function SponsorsManageLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await requireOrgPermission(orgSlug, "sponsors.read");

  return <AppShell orgContext={orgContext}>{children}</AppShell>;
}
