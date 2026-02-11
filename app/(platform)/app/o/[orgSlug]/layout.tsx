import { AppShell } from "@/components/shared/AppShell";
import { OrgProvider } from "@/components/shared/org-provider";
import { resolveOrg } from "@/lib/tenancy/resolveOrg";

export default async function OrgScopedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgContext = await resolveOrg(orgSlug);

  return (
    <OrgProvider value={orgContext}>
      <AppShell orgContext={orgContext}>{children}</AppShell>
    </OrgProvider>
  );
}
